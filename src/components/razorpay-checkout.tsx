"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CheckoutStatus = "idle" | "starting" | "open" | "verifying" | "paid" | "pending" | "error";

type OrderResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  email: string;
  contact: string;
  description: string;
  message?: string;
};

type CheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error?: {
    description?: string;
  };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  retry: { enabled: boolean };
  handler: (response: CheckoutSuccess) => void;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", callback: (response: RazorpayFailure) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const RAZORPAY_LOAD_TIMEOUT_MS = 15_000;
let razorpayLoadPromise: Promise<void> | null = null;

export function RazorpayCheckout({
  alreadyPaid,
  amountLabel,
}: {
  alreadyPaid: boolean;
  amountLabel: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<CheckoutStatus>(alreadyPaid ? "paid" : "idle");
  const [message, setMessage] = useState("");
  const busy = ["starting", "open", "verifying"].includes(status);

  async function startPayment() {
    setStatus("starting");
    setMessage("");

    try {
      await loadRazorpayCheckout();
      const orderResponse = await fetch("/api/payments/order", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const order = (await orderResponse.json()) as OrderResponse;

      if (!orderResponse.ok || !order.orderId || !window.Razorpay) {
        throw new Error(order.message ?? "Payment could not be started.");
      }

      let checkoutCompleted = false;
      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Investment Summit",
        description: order.description,
        order_id: order.orderId,
        prefill: {
          name: order.name,
          email: order.email,
          contact: order.contact,
        },
        theme: { color: "#0C4A66" },
        retry: { enabled: true },
        handler: async (response) => {
          checkoutCompleted = true;
          setStatus("verifying");
          setMessage("Verifying your payment securely...");

          try {
            const verificationResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const result = (await verificationResponse.json()) as {
              paid?: boolean;
              message?: string;
            };

            if (!verificationResponse.ok) {
              throw new Error(result.message ?? "Payment verification failed.");
            }

            if (result.paid) {
              setStatus("paid");
              setMessage(result.message ?? "Payment received.");
              router.replace("/confirmation");
              router.refresh();
              return;
            }

            setStatus("pending");
            setMessage(result.message ?? "Payment received and awaiting confirmation.");
          } catch (error) {
            setStatus("error");
            setMessage(
              error instanceof Error
                ? error.message
                : "We could not verify the payment. Please contact support.",
            );
          }
        },
        modal: {
          ondismiss: () => {
            if (!checkoutCompleted) {
              setStatus("idle");
              setMessage("Payment window closed. You can try again when ready.");
            }
          },
        },
      });

      razorpay.on("payment.failed", () => {
        setStatus("error");
        setMessage("The payment was not completed. No successful charge was recorded.");
      });

      setStatus("open");
      razorpay.open();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be started. Please try again.",
      );
    }
  }

  if (status === "paid") {
    return (
      <div className="mt-7 border border-[#7fc0c8] bg-[#e7f4f5] p-4 text-[#0c4a66]" role="status">
        <p className="font-semibold">Payment already completed</p>
        <p className="mt-1 text-xs leading-5 text-[#2c6f79]">Your summit registration is confirmed. You do not need to pay again.</p>
        <a className="mt-3 inline-flex text-xs font-semibold underline underline-offset-2" href="/confirmation">
          View confirmation
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <button
        className="summit-payment-button disabled:cursor-wait disabled:opacity-65"
        type="button"
        disabled={busy}
        onClick={startPayment}
      >
        {status === "starting"
          ? "Preparing secure checkout..."
          : status === "open"
            ? "Checkout open"
            : status === "verifying"
              ? "Verifying payment..."
              : `Pay ${amountLabel} securely`}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-white/50">Test Mode · Secured by Razorpay</p>
      {message && (
        <div
          className={`mt-4 border px-3 py-2.5 text-xs leading-5 ${
            status === "pending"
              ? "border-[#0da1a7] bg-[#e7f4f5] text-[#0c4a66]"
              : status === "error"
                ? "border-[#a8422c] bg-[#542c2c] text-[#ffd9df]"
                : "border-white/20 bg-white/10 text-white/70"
          }`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </div>
      )}
    </div>
  );
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayLoadPromise) return razorpayLoadPromise;

  // A script element remains in the document after some browser/network
  // failures. Reusing that failed element means its error event has already
  // fired, so a second click can wait forever. Remove it and create a fresh
  // request for every retry.
  document
    .querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SRC}"]`)
    ?.remove();

  razorpayLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      script.onload = null;
      script.onerror = null;

      if (error) {
        script.remove();
        razorpayLoadPromise = null;
        reject(error);
        return;
      }

      resolve();
    };

    const loadError = () =>
      finish(
        new Error(
          "Razorpay could not be reached. Check your internet connection or disable an ad blocker for this page, then try again. You have not been charged.",
        ),
      );

    const timeoutId = window.setTimeout(loadError, RAZORPAY_LOAD_TIMEOUT_MS);

    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => {
      if (!window.Razorpay) {
        loadError();
        return;
      }

      finish();
    };
    script.onerror = loadError;
    document.body.appendChild(script);
  });

  return razorpayLoadPromise;
}
