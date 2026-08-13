import "server-only";

import { summitSite } from "@/lib/summit/site";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type DeliveryResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "already_processed" | "not_configured" | "not_ready" }
  | { status: "failed"; error: string };

type Application = {
  id: number;
  first_name: string;
  last_name: string;
  amount_due_paise: number;
  paid_at: string | null;
  plan_id: number;
  redeem_code_id: number | null;
};

type PaymentOrder = {
  id: number;
  provider_order_id: string | null;
  amount_paise: number;
  key_mode: "test" | "live";
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export async function sendPaymentConfirmationEmail(
  applicationId: number,
): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PAYMENT_CONFIRMATION_FROM_EMAIL?.trim();

  if (!apiKey || !from) return { status: "not_configured" };

  const supabase = createSupabaseServiceClient();
  const { data: claimData, error: claimError } = await supabase.rpc(
    "claim_summit_payment_confirmation_email",
    { p_application_id: applicationId },
  );

  if (claimError) {
    return { status: "failed", error: "The confirmation email could not be claimed." };
  }

  const claim = Array.isArray(claimData) ? claimData[0] : null;
  if (!claim?.delivery_id || !claim.recipient_email) {
    return { status: "already_processed" };
  }

  const deliveryId = Number(claim.delivery_id);

  try {
    const { data: applicationData, error: applicationError } = await supabase
      .from("summit_applications")
      .select("id, first_name, last_name, amount_due_paise, paid_at, plan_id, redeem_code_id")
      .eq("id", applicationId)
      .eq("status", "paid")
      .maybeSingle();

    const application = applicationData as Application | null;
    if (applicationError || !application) {
      throw new Error("The paid registration could not be loaded.");
    }

    const [{ data: plan }, { data: orderData }, { data: redeemCode }] =
      await Promise.all([
        supabase
          .from("summit_plans")
          .select("name")
          .eq("id", application.plan_id)
          .maybeSingle(),
        supabase
          .from("summit_payment_orders")
          .select("id, provider_order_id, amount_paise, key_mode")
          .eq("application_id", application.id)
          .eq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        application.redeem_code_id
          ? supabase
              .from("summit_redeem_codes")
              .select("code_normalized")
              .eq("id", application.redeem_code_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    const order = orderData as PaymentOrder | null;
    if (!order) throw new Error("The captured payment order could not be loaded.");

    const { data: attempt } = await supabase
      .from("summit_payment_attempts")
      .select("provider_payment_id, method, captured_at")
      .eq("payment_order_id", order.id)
      .eq("status", "captured")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const attendeeName = `${application.first_name} ${application.last_name}`.trim();
    const paymentReference =
      attempt?.provider_payment_id ?? order.provider_order_id ?? "Confirmed";
    const registrationReference = `IS-${String(application.id).padStart(6, "0")}`;
    const amount = formatRupees(order.amount_paise ?? application.amount_due_paise);
    const paidAt = attempt?.captured_at ?? application.paid_at;
    const testMode = order.key_mode === "test";
    const supportEmail = summitSite.supportEmail;
    const supportPhone = summitSite.supportPhone;
    const eventLocation = summitSite.eventLocation;
    const subject = `${testMode ? "[TEST] " : ""}Payment confirmed — Industrial Summit`;
    const logoUrl = `${siteUrl()}/industrial-summit-logo-v2.png`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `summit-payment-confirmation-${application.id}`,
      },
      body: JSON.stringify({
        from,
        to: [claim.recipient_email],
        ...(supportEmail?.includes("@") ? { reply_to: supportEmail } : {}),
        subject,
        html: renderConfirmationHtml({
          amount,
          attendeeName,
          eventLocation,
          paidAt,
          paymentReference,
          planName: plan?.name ?? "Industrial Summit Pass",
          redeemCode: redeemCode?.code_normalized ?? null,
          registrationReference,
          logoUrl,
          supportEmail,
          supportPhone,
          testMode,
        }),
        text: renderConfirmationText({
          amount,
          attendeeName,
          eventLocation,
          paidAt,
          paymentReference,
          planName: plan?.name ?? "Industrial Summit Pass",
          redeemCode: redeemCode?.code_normalized ?? null,
          registrationReference,
          supportEmail,
          supportPhone,
          testMode,
        }),
      }),
    });

    const result = (await response.json()) as ResendResponse;
    if (!response.ok || !result.id) {
      throw new Error(result.message ?? result.name ?? "The email provider rejected the message.");
    }

    const { error: sentError } = await supabase
      .from("summit_email_deliveries")
      .update({
        status: "sent",
        provider_message_id: result.id,
        sent_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", deliveryId)
      .eq("status", "sending");
    if (sentError) throw sentError;

    return { status: "sent", providerMessageId: result.id };
  } catch (error) {
    const safeError =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Payment confirmation email failed.";

    await supabase
      .from("summit_email_deliveries")
      .update({ status: "failed", last_error: safeError })
      .eq("id", deliveryId)
      .eq("status", "sending");

    return { status: "failed", error: safeError };
  }
}

type TemplateValues = {
  amount: string;
  attendeeName: string;
  eventLocation: string;
  paidAt: string | null;
  paymentReference: string;
  planName: string;
  redeemCode: string | null;
  registrationReference: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
  testMode: boolean;
};

function renderConfirmationHtml(values: TemplateValues) {
  const rows = [
    ["Registration reference", values.registrationReference],
    ["Payment reference", values.paymentReference],
    ["Summit pass", values.planName],
    ["Amount paid", values.amount],
    ...(values.redeemCode ? [["Redeem code", values.redeemCode]] : []),
    ...(values.paidAt ? [["Paid on", formatDate(values.paidAt)]] : []),
  ];

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5fbfb;color:#093c54;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">Your summit payment has been confirmed.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5fbfb;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #093c54">
          <tr><td align="center" style="background:#ffffff;padding:22px 30px">
            <img src="${escapeHtml(values.logoUrl)}" width="520" alt="Industrial Summit" style="display:block;width:100%;max-width:520px;height:auto;border:0" />
          </td></tr>
          <tr><td style="background:#052c3e;color:#f5fbfb;padding:24px 30px">
            <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;font-weight:normal">Payment confirmed</h1>
          </td></tr>
          <tr><td style="padding:30px">
            <p style="margin:0 0 16px;font-size:17px">Hello ${escapeHtml(values.attendeeName)},</p>
            <p style="margin:0 0 22px;line-height:1.6">Your payment has been received and your registration is confirmed.</p>
            ${values.testMode ? '<p style="margin:0 0 22px;padding:12px;background:#e7f4f5;border:1px solid #0da1a7;color:#0c4a66"><strong>Test Mode:</strong> no real money was charged.</p>' : ""}
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
              ${rows.map(([label, value]) => `<tr><td style="border-top:1px solid rgba(9,60,84,.16);padding:11px 0;color:#507080">${escapeHtml(label)}</td><td align="right" style="border-top:1px solid rgba(9,60,84,.16);padding:11px 0;font-weight:bold">${escapeHtml(value)}</td></tr>`).join("")}
            </table>
            <p style="margin:24px 0 0;font-size:14px;line-height:1.6">Need help with your payment or registration? Email <a href="mailto:${escapeHtml(values.supportEmail)}" style="color:#0c4a66;font-weight:bold">${escapeHtml(values.supportEmail)}</a> or call <a href="tel:${escapeHtml(phoneHref(values.supportPhone))}" style="color:#0c4a66;font-weight:bold">${escapeHtml(values.supportPhone)}</a>.</p>
            <p style="margin:24px 0 0;color:#507080;font-size:13px;line-height:1.6">Venue: <strong>${escapeHtml(values.eventLocation)}</strong>. Keep this email for your records. Any event updates will be sent to your registered email address.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function renderConfirmationText(values: Omit<TemplateValues, "logoUrl">) {
  return [
    `Hello ${values.attendeeName},`,
    "",
    "Your payment has been received and your Industrial Summit registration is confirmed.",
    ...(values.testMode ? ["TEST MODE: No real money was charged."] : []),
    "",
    `Registration reference: ${values.registrationReference}`,
    `Payment reference: ${values.paymentReference}`,
    `Summit pass: ${values.planName}`,
    `Amount paid: ${values.amount}`,
    ...(values.redeemCode ? [`Redeem code: ${values.redeemCode}`] : []),
    ...(values.paidAt ? [`Paid on: ${formatDate(values.paidAt)}`] : []),
    `Venue: ${values.eventLocation}`,
    "",
    `Need help with your payment or registration? Email ${values.supportEmail} or call ${values.supportPhone}.`,
  ].join("\n");
}

function formatRupees(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function phoneHref(value: string) {
  return value.replace(/\s+/g, "");
}

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://jalna-investment-summit.netlify.app"
  );
}
