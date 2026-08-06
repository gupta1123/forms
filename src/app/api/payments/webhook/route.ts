import { verifyRazorpayWebhookSignature } from "@/lib/payments/security";
import { fetchRazorpayPayment } from "@/lib/razorpay/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
};

const supportedEvents = new Set([
  "payment.authorized",
  "payment.captured",
  "payment.failed",
  "order.paid",
]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";

  if (!eventId || !verifyRazorpayWebhookSignature(rawBody, signature)) {
    return Response.json({ message: "Invalid webhook signature." }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  try {
    const payload = JSON.parse(rawBody) as WebhookPayload;
    const eventType = payload.event ?? "unknown";

    const { data: existingEvent } = await supabase
      .from("summit_payment_webhook_events")
      .select("processing_status")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (
      existingEvent?.processing_status === "processed" ||
      existingEvent?.processing_status === "ignored"
    ) {
      return Response.json({ received: true });
    }

    if (!existingEvent) {
      const { error: insertError } = await supabase
        .from("summit_payment_webhook_events")
        .insert({
          provider_event_id: eventId,
          event_type: eventType,
          payload,
          processing_status: "received",
          processing_attempts: 1,
        });

      if (insertError && insertError.code !== "23505") throw insertError;
    }

    if (!supportedEvents.has(eventType)) {
      await supabase
        .from("summit_payment_webhook_events")
        .update({ processing_status: "ignored", processed_at: new Date().toISOString() })
        .eq("provider_event_id", eventId);
      return Response.json({ received: true });
    }

    const paymentId = payload.payload?.payment?.entity?.id;
    const payloadOrderId = payload.payload?.payment?.entity?.order_id;
    if (!paymentId || !payloadOrderId) throw new Error("Webhook payment data is missing.");

    // Fetch current provider state instead of trusting an asynchronously delivered snapshot.
    const payment = await fetchRazorpayPayment(paymentId);
    if (payment.order_id !== payloadOrderId) throw new Error("Webhook order mismatch.");

    const { data: order, error: orderError } = await supabase
      .from("summit_payment_orders")
      .select("application_id, provider_order_id, amount_paise, currency")
      .eq("provider", "razorpay")
      .eq("provider_order_id", payment.order_id)
      .maybeSingle();
    if (orderError) throw orderError;

    if (!order) {
      await supabase
        .from("summit_payment_webhook_events")
        .update({ processing_status: "ignored", processed_at: new Date().toISOString() })
        .eq("provider_event_id", eventId);
      return Response.json({ received: true });
    }

    if (payment.amount !== order.amount_paise || payment.currency !== order.currency) {
      throw new Error("Webhook amount mismatch.");
    }

    const { error: recordError } = await supabase.rpc("record_summit_payment_result", {
      p_application_id: order.application_id,
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

    await supabase
      .from("summit_payment_webhook_events")
      .update({
        processing_status: "processed",
        last_error: null,
        processed_at: new Date().toISOString(),
      })
      .eq("provider_event_id", eventId);

    return Response.json({ received: true });
  } catch {
    await supabase
      .from("summit_payment_webhook_events")
      .update({
        processing_status: "failed",
        last_error: "Payment webhook processing failed.",
      })
      .eq("provider_event_id", eventId);

    return Response.json({ message: "Webhook processing failed." }, { status: 500 });
  }
}

