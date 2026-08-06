import { cookies } from "next/headers";

import { isSameOriginRequest } from "@/lib/payments/security";
import {
  createOrRecoverRazorpayOrder,
  getRazorpayPublicConfig,
} from "@/lib/razorpay/server";
import {
  CHECKOUT_COOKIE_NAME,
  isCheckoutToken,
} from "@/lib/summit/constants";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type ApplicationRow = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  amount_due_paise: number;
  status: "details_submitted" | "payment_pending" | "paid" | "cancelled";
};

type PaymentOrderRow = {
  id: number;
  provider_order_id: string | null;
  receipt: string;
  amount_paise: number;
  currency: string;
  status: string;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  }

  try {
    const cookieStore = await cookies();
    const checkoutToken = cookieStore.get(CHECKOUT_COOKIE_NAME)?.value;
    if (!isCheckoutToken(checkoutToken)) {
      return Response.json({ message: "Registration not found." }, { status: 401 });
    }

    const supabase = createSupabaseServiceClient();
    const { data: applicationData, error: applicationError } = await supabase
      .from("summit_applications")
      .select("id, first_name, last_name, phone, email, amount_due_paise, status")
      .eq("checkout_token", checkoutToken)
      .maybeSingle();
    const application = applicationData as ApplicationRow | null;

    if (applicationError || !application) {
      return Response.json({ message: "Registration not found." }, { status: 404 });
    }
    if (application.status === "paid") {
      return Response.json({ message: "This registration is already paid." }, { status: 409 });
    }
    if (application.status === "cancelled") {
      return Response.json({ message: "This registration was cancelled." }, { status: 409 });
    }

    const { keyId, keyMode } = getRazorpayPublicConfig();
    const receipt = `summit-${application.id}`;

    const { error: reserveError } = await supabase
      .from("summit_payment_orders")
      .upsert(
        {
          application_id: application.id,
          provider: "razorpay",
          key_mode: keyMode,
          receipt,
          amount_paise: application.amount_due_paise,
          currency: "INR",
          status: "initializing",
        },
        { onConflict: "application_id,key_mode", ignoreDuplicates: true },
      );

    if (reserveError) throw reserveError;

    const { data: orderData, error: orderError } = await supabase
      .from("summit_payment_orders")
      .select("id, provider_order_id, receipt, amount_paise, currency, status")
      .eq("application_id", application.id)
      .eq("key_mode", keyMode)
      .single();
    const localOrder = orderData as PaymentOrderRow | null;

    if (orderError || !localOrder) throw orderError ?? new Error("Payment order was not reserved.");
    if (localOrder.amount_paise !== application.amount_due_paise) {
      return Response.json(
        { message: "The payable amount changed. Please contact support." },
        { status: 409 },
      );
    }

    let providerOrderId = localOrder.provider_order_id;
    if (!providerOrderId) {
      const providerOrder = await createOrRecoverRazorpayOrder({
        amount: localOrder.amount_paise,
        currency: localOrder.currency,
        receipt: localOrder.receipt,
        applicationId: application.id,
      });
      providerOrderId = providerOrder.id;

      const { error: attachError } = await supabase
        .from("summit_payment_orders")
        .update({
          provider_order_id: providerOrder.id,
          status: providerOrder.status,
          attempts: providerOrder.attempts,
          provider_created_at: new Date(providerOrder.created_at * 1000).toISOString(),
          last_error_code: null,
          last_error_description: null,
        })
        .eq("id", localOrder.id)
        .is("provider_order_id", null);

      if (attachError) throw attachError;
    }

    const { error: statusError } = await supabase
      .from("summit_applications")
      .update({ status: "payment_pending" })
      .eq("id", application.id)
      .eq("status", "details_submitted");
    if (statusError) throw statusError;

    return Response.json(
      {
        keyId,
        orderId: providerOrderId,
        amount: localOrder.amount_paise,
        currency: localOrder.currency,
        name: `${application.first_name} ${application.last_name}`,
        email: application.email,
        contact: application.phone,
        description: "Investment Summit Pass",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { message: "Payment could not be started. Please try again." },
      { status: 500 },
    );
  }
}

