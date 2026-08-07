import { cookies } from "next/headers";
import { z } from "zod";

import { sendPaymentConfirmationEmail } from "@/lib/email/payment-confirmation";
import {
  isSameOriginRequest,
  verifyRazorpayCheckoutSignature,
} from "@/lib/payments/security";
import { fetchRazorpayPayment, getRazorpayPublicConfig } from "@/lib/razorpay/server";
import {
  CHECKOUT_COOKIE_NAME,
  isCheckoutToken,
} from "@/lib/summit/constants";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const verificationSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/).max(100),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/).max(100),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  }

  try {
    const parsed = verificationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ message: "Invalid payment response." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const checkoutToken = cookieStore.get(CHECKOUT_COOKIE_NAME)?.value;
    if (!isCheckoutToken(checkoutToken)) {
      return Response.json({ message: "Registration not found." }, { status: 401 });
    }

    const supabase = createSupabaseServiceClient();
    const { keyMode } = getRazorpayPublicConfig();
    const { data: application, error: applicationError } = await supabase
      .from("summit_applications")
      .select("id")
      .eq("checkout_token", checkoutToken)
      .maybeSingle();
    if (applicationError || !application) {
      return Response.json({ message: "Registration not found." }, { status: 404 });
    }

    const { data: order, error: orderError } = await supabase
      .from("summit_payment_orders")
      .select("provider_order_id, amount_paise, currency")
      .eq("application_id", application.id)
      .eq("key_mode", keyMode)
      .maybeSingle();

    if (orderError || !order?.provider_order_id) {
      return Response.json({ message: "Payment order not found." }, { status: 404 });
    }
    if (parsed.data.razorpay_order_id !== order.provider_order_id) {
      return Response.json({ message: "Payment verification failed." }, { status: 400 });
    }

    const signatureIsValid = verifyRazorpayCheckoutSignature({
      orderId: order.provider_order_id,
      paymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature,
    });
    if (!signatureIsValid) {
      return Response.json({ message: "Payment verification failed." }, { status: 400 });
    }

    const payment = await fetchRazorpayPayment(parsed.data.razorpay_payment_id);
    if (
      payment.order_id !== order.provider_order_id ||
      payment.amount !== order.amount_paise ||
      payment.currency !== order.currency
    ) {
      return Response.json({ message: "Payment verification failed." }, { status: 400 });
    }

    const { error: recordError } = await supabase.rpc("record_summit_payment_result", {
      p_application_id: application.id,
      p_provider_order_id: order.provider_order_id,
      p_provider_payment_id: payment.id,
      p_payment_status: payment.status,
      p_amount_paise: payment.amount,
      p_currency: payment.currency,
      p_method: payment.method ?? null,
      p_signature_verified: true,
      p_error_code: payment.error_code ?? null,
      p_error_description: payment.error_description ?? null,
      p_error_source: payment.error_source ?? null,
      p_error_step: payment.error_step ?? null,
      p_error_reason: payment.error_reason ?? null,
    });
    if (recordError) throw recordError;

    const paid = payment.status === "captured";
    const emailDelivery = paid
      ? await sendPaymentConfirmationEmail(application.id)
      : { status: "not_ready" as const };

    if (emailDelivery.status === "failed") {
      console.error("Payment confirmation email failed:", emailDelivery.error);
    }

    return Response.json(
      {
        paid,
        emailStatus: emailDelivery.status,
        status: paid ? "paid" : "payment_pending",
        message: paid
          ? "Payment completed successfully."
          : "Payment received and awaiting capture confirmation.",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { message: "We could not verify the payment. Please contact support." },
      { status: 500 },
    );
  }
}
