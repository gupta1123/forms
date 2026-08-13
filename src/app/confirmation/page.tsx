import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PiCheck } from "react-icons/pi";

import { startAnotherRegistration } from "@/app/confirmation/actions";
import { SiteFooter } from "@/components/site-footer";
import { SummitHeader, SummitShell } from "@/components/summit-chrome";
import { sendPaymentConfirmationEmail } from "@/lib/email/payment-confirmation";
import {
  CHECKOUT_COOKIE_NAME,
  isCheckoutToken,
} from "@/lib/summit/constants";
import { summitSite } from "@/lib/summit/site";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registration Confirmed | Industrial Summit",
  description: "Your Industrial Summit registration confirmation.",
  robots: { index: false, follow: false },
};

type Application = {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  registration_type: "individual" | "corporate";
  company_name: string | null;
  attendee_count: number;
  amount_due_paise: number;
  status: "details_submitted" | "payment_pending" | "paid" | "cancelled";
  paid_at: string | null;
  plan_id: number;
  redeem_code_id: number | null;
};

type PaymentOrder = {
  id: number;
  provider_order_id: string | null;
  amount_paise: number;
};

export default async function ConfirmationPage() {
  const cookieStore = await cookies();
  const checkoutToken = cookieStore.get(CHECKOUT_COOKIE_NAME)?.value;
  if (!isCheckoutToken(checkoutToken)) redirect("/");

  const supabase = createSupabaseServiceClient();
  const { data: applicationData } = await supabase
    .from("summit_applications")
    .select("id, first_name, last_name, email, registration_type, company_name, attendee_count, amount_due_paise, status, paid_at, plan_id, redeem_code_id")
    .eq("checkout_token", checkoutToken)
    .maybeSingle();
  const application = applicationData as Application | null;

  if (!application) redirect("/");
  if (application.status !== "paid") redirect("/plans");

  // Also picks up a queued confirmation if the payment webhook completed
  // before email delivery was configured or a transient provider error occurred.
  const emailDelivery = application.email
    ? await sendPaymentConfirmationEmail(application.id)
    : null;

  const [{ data: plan }, { data: orderData }] = await Promise.all([
    supabase
      .from("summit_plans")
      .select("name")
      .eq("id", application.plan_id)
      .maybeSingle(),
    supabase
      .from("summit_payment_orders")
      .select("id, provider_order_id, amount_paise")
      .eq("application_id", application.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const order = orderData as PaymentOrder | null;

  const [{ data: redeemCode }, { data: attempt }] = await Promise.all([
    application.redeem_code_id
      ? supabase
          .from("summit_redeem_codes")
          .select("code_normalized")
          .eq("id", application.redeem_code_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    order
      ? supabase
          .from("summit_payment_attempts")
          .select("provider_payment_id, method, captured_at")
          .eq("payment_order_id", order.id)
          .eq("status", "captured")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const attendeeName = application.registration_type === "corporate"
    ? `${application.first_name} ${application.last_name}`.trim()
    : `${application.first_name} ${application.last_name}`;
  const registrationReference = `IS-${String(application.id).padStart(6, "0")}`;
  const paymentReference =
    attempt?.provider_payment_id ?? order?.provider_order_id ?? "Confirmed";
  const paidAt = attempt?.captured_at ?? application.paid_at;

  return (
    <main className="summit-app flex flex-col">
      <SummitHeader activeStep={4} greeting={attendeeName} />
      <SummitShell activeStep={4}>
        <section aria-labelledby="confirmation-title" className="summit-panel">
          <div className="summit-confirmation">
            <span className="summit-success-icon">
              <PiCheck aria-hidden="true" />
            </span>
            <p className="summit-kicker mt-5">Payment successful</p>
            <h1 id="confirmation-title">
              You&apos;re <em>registered.</em>
            </h1>
            <p className="summit-confirmation-intro">
              Thank you, {attendeeName}. Your summit pass is confirmed and the
              payment has been recorded.{" "}
              {application.email && emailDelivery
                ? emailDelivery.status === "sent"
                  ? `A receipt was sent to ${application.email}.`
                  : `A receipt will be sent to ${application.email}.`
                : "Your corporate registration includes all attendees shown below."}
            </p>

            <div className="summit-confirmation-card">
              <dl className="summit-confirmation-grid">
              <ConfirmationItem label="Registration reference" value={registrationReference} />
              <ConfirmationItem label="Payment reference" value={paymentReference} />
              <ConfirmationItem label="Summit pass" value={plan?.name ?? "Industrial Summit Pass"} />
              <ConfirmationItem label="Venue" value={summitSite.eventLocation} />
              <ConfirmationItem label="Amount paid" value={formatRupees(order?.amount_paise ?? application.amount_due_paise)} />
              {application.email && <ConfirmationItem label="Registered email" value={application.email} />}
              {application.registration_type === "corporate" && (
                <>
                  <ConfirmationItem label="Company" value={application.company_name ?? "Corporate registration"} />
                  <ConfirmationItem label="People attending" value={String(application.attendee_count)} />
                </>
              )}
              <ConfirmationItem label="Payment method" value={formatPaymentMethod(attempt?.method)} />
              {redeemCode?.code_normalized && (
                <ConfirmationItem label="Redeem code" value={redeemCode.code_normalized} />
              )}
              {paidAt && <ConfirmationItem label="Paid on" value={formatDate(paidAt)} />}
              </dl>
            </div>

            <p className="mx-auto mt-7 max-w-[610px] text-center text-sm leading-6 text-[var(--ink-72)]">
              Need help with your payment or registration? Email{" "}
              <a
                className="font-semibold text-[var(--navy)] underline underline-offset-4 hover:text-[var(--brass)]"
                href={`mailto:${summitSite.supportEmail}`}
              >
                {summitSite.supportEmail}
              </a>{" "}
              or call{" "}
              <a
                className="font-semibold text-[var(--navy)] underline underline-offset-4 hover:text-[var(--brass)]"
                href={`tel:${summitSite.supportPhone.replace(/\s+/g, "")}`}
              >
                {summitSite.supportPhone}
              </a>
              .
            </p>

            <div className="summit-actions mx-auto max-w-[610px] justify-center">
              <form action={startAnotherRegistration}>
                <button className="button-primary h-11 w-full px-5" type="submit">
                  Register another attendee
                </button>
              </form>
            </div>
          </div>
        </section>
      </SummitShell>

      <SiteFooter />
    </main>
  );
}

function ConfirmationItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
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
  }).format(new Date(value));
}

function formatPaymentMethod(method: string | null | undefined) {
  if (!method) return "Razorpay";
  return method.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
