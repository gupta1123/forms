import "server-only";

type RazorpayOrder = {
  id: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  created_at: number;
};

export type RazorpayPayment = {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id: string;
  method?: string;
  captured?: boolean;
  error_code?: string | null;
  error_description?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
};

type RazorpayCollection<T> = {
  entity: "collection";
  count: number;
  items: T[];
};

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "RazorpayApiError";
  }
}

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured.");
  }

  const keyMode = keyId.startsWith("rzp_test_")
    ? "test"
    : keyId.startsWith("rzp_live_")
      ? "live"
      : null;

  if (!keyMode) throw new Error("The Razorpay Key ID is invalid.");

  return { keyId, keySecret, keyMode } as const;
}

async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { keyId, keySecret } = getCredentials();
  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${authorization}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new RazorpayApiError("Razorpay rejected the request.", response.status);
  }

  return (await response.json()) as T;
}

export function getRazorpayPublicConfig() {
  const { keyId, keyMode } = getCredentials();
  return { keyId, keyMode };
}

export async function createOrRecoverRazorpayOrder(input: {
  amount: number;
  currency: string;
  receipt: string;
  applicationId: number;
}) {
  const query = new URLSearchParams({ receipt: input.receipt, count: "10" });
  const existing = await razorpayRequest<RazorpayCollection<RazorpayOrder>>(
    `/orders?${query}`,
  );
  const matchingOrder = existing.items.find(
    (order) =>
      order.receipt === input.receipt &&
      order.amount === input.amount &&
      order.currency === input.currency,
  );

  if (matchingOrder) return matchingOrder;

  try {
    return await razorpayRequest<RazorpayOrder>("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        receipt: input.receipt,
        partial_payment: false,
        notes: { summit_application_id: String(input.applicationId) },
      }),
    });
  } catch (error) {
    if (!(error instanceof RazorpayApiError) || error.statusCode !== 400) {
      throw error;
    }

    const recovered = await razorpayRequest<RazorpayCollection<RazorpayOrder>>(
      `/orders?${query}`,
    );
    const recoveredOrder = recovered.items.find(
      (order) =>
        order.receipt === input.receipt &&
        order.amount === input.amount &&
        order.currency === input.currency,
    );

    if (!recoveredOrder) throw error;
    return recoveredOrder;
  }
}

export function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest<RazorpayPayment>(
    `/payments/${encodeURIComponent(paymentId)}`,
  );
}

