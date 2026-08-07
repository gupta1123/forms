import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PiCheck, PiSealCheck } from "react-icons/pi";

import { RedeemCodeForm } from "@/components/redeem-code-form";
import { RazorpayCheckout } from "@/components/razorpay-checkout";
import { SiteFooter } from "@/components/site-footer";
import {
  SummitHeader,
  SummitPanelHeader,
  SummitShell,
} from "@/components/summit-chrome";
import {
  CHECKOUT_COOKIE_NAME,
  isCheckoutToken,
} from "@/lib/summit/constants";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type Checkout = {
  attendee_name: string;
  plan_name: string;
  plan_description: string | null;
  original_amount_paise: number;
  amount_due_paise: number;
  discount_amount_paise: number;
  has_redeem_code: boolean;
};

type Registration = {
  id: number;
  status: "details_submitted" | "payment_pending" | "paid" | "cancelled";
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

export const dynamic = "force-dynamic";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ redeemed?: string }>;
}) {
  const cookieStore = await cookies();
  const checkoutToken = cookieStore.get(CHECKOUT_COOKIE_NAME)?.value;

  if (!isCheckoutToken(checkoutToken)) redirect("/");

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("get_summit_checkout", {
    p_checkout_token: checkoutToken,
  });
  const checkout = (Array.isArray(data) ? data[0] : null) as Checkout | null;

  if (error || !checkout) redirect("/");

  const { data: registrationData } = await supabase
    .from("summit_applications")
    .select("id, status, first_name, last_name, email, phone")
    .eq("checkout_token", checkoutToken)
    .maybeSingle();
  const registration = registrationData as Registration | null;

  if (!registration) redirect("/");

  if (registration.status === "paid") {
    const attendeeName = `${registration.first_name} ${registration.last_name}`.trim();

    return (
      <main className="summit-app flex flex-col">
        <SummitHeader activeStep={4} greeting={attendeeName} />
        <SummitShell activeStep={4}>
          <section
            aria-labelledby="paid-registration-title"
            className="summit-panel"
          >
            <div className="summit-confirmation">
              <span className="summit-success-icon">
                <PiCheck aria-hidden="true" />
              </span>
              <p className="summit-kicker mt-5">Payment already completed</p>
              <h1 id="paid-registration-title">
                You&apos;re already <em>registered.</em>
              </h1>
              <p className="summit-confirmation-intro">
                We found a completed payment matching the email address and
                phone number you entered. No additional payment is required.
              </p>

              <div className="summit-confirmation-card">
                <dl className="summit-confirmation-grid">
                  <PaidRegistrationItem label="Name" value={attendeeName} />
                  <PaidRegistrationItem
                    label="Email address"
                    value={registration.email}
                  />
                  <PaidRegistrationItem
                    label="Phone number"
                    value={registration.phone}
                  />
                </dl>
              </div>

              <div className="summit-actions mx-auto max-w-[610px] justify-center">
                <Link
                  className="button-primary inline-flex h-11 items-center justify-center px-5"
                  href="/confirmation"
                >
                  View payment confirmation
                </Link>
              </div>
            </div>
          </section>
        </SummitShell>
        <SiteFooter />
      </main>
    );
  }

  const { count: paymentOrderCount } = await supabase
    .from("summit_payment_orders")
    .select("id", { count: "exact", head: true })
    .eq("application_id", registration.id);

  const paymentStarted = (paymentOrderCount ?? 0) > 0;

  const { redeemed } = await searchParams;
  const originalPrice = formatRupees(checkout.original_amount_paise);
  const amountDue = formatRupees(checkout.amount_due_paise);
  const discount = formatRupees(checkout.discount_amount_paise);

  return (
    <main className="summit-app flex flex-col">
      <SummitHeader activeStep={2} greeting={checkout.attendee_name} />
      <SummitShell activeStep={2}>
        <section aria-labelledby="summit-panel-title" className="summit-panel">
          <SummitPanelHeader
            accent="summit pass."
            description="One pass covers the summit. Apply your redeem code before starting payment."
            step="Step 2 of 3"
            title="Your"
          />
          <div className="summit-panel-body">
            {redeemed && (
              <div className="summit-notice is-success" role="status">
                Redeem code applied. You saved {discount}.
              </div>
            )}

            <div className="summit-pass">
              <div className="summit-pass-main">
                <span className="summit-pass-badge">
                  <PiSealCheck aria-hidden="true" />
                  Full-day access
                </span>
                <h3>{checkout.plan_name}</h3>
                <p className="summit-pass-description">
                  Delegate access to every session, meeting track and the
                  networking programme.
                </p>

                <ul className="summit-feature-list">
                  <PlanFeature>
                    Inaugural session and the Jalna opportunity presentation
                  </PlanFeature>
                  <PlanFeature>
                    All sector opportunity tracks and policy sessions
                  </PlanFeature>
                  <PlanFeature>
                    Pre-scheduled B2B and B2G meeting slots you requested
                  </PlanFeature>
                  <PlanFeature>
                    Networking lunch and the investor delegate directory
                  </PlanFeature>
                  <PlanFeature>GST included in the displayed price</PlanFeature>
                </ul>

                <div className="summit-redeem">
                  <RedeemCodeForm
                    applied={checkout.has_redeem_code}
                    locked={paymentStarted}
                    paid={false}
                  />
                </div>
              </div>

              <aside className="summit-order-summary">
                <h3>Order summary</h3>
                <div className="summit-price-row">
                  <span>Summit pass × 1</span>
                  <strong>{originalPrice}</strong>
                </div>
                {checkout.discount_amount_paise > 0 && (
                  <div className="summit-price-row is-discount">
                    <span>Redeem discount</span>
                    <strong>−{discount}</strong>
                  </div>
                )}
                <div className="summit-price-row">
                  <span>GST</span>
                  <strong>Included</strong>
                </div>

                <div className="summit-total">
                  <span className="summit-total-label">Total payable</span>
                  <p className="summit-total-amount">
                    {checkout.discount_amount_paise > 0 && <s>{originalPrice}</s>}
                    {amountDue}
                  </p>
                  <p className="summit-total-note">Inclusive of GST. Charged once, at payment.</p>
                </div>

                <RazorpayCheckout alreadyPaid={false} amountLabel={amountDue} />
              </aside>
            </div>

            {!paymentStarted && (
              <div className="summit-actions">
                <Link className="summit-quiet-link" href="/">Edit your details</Link>
              </div>
            )}
          </div>
        </section>
      </SummitShell>
      <SiteFooter />
    </main>
  );
}

function formatRupees(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <PiCheck aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

function PaidRegistrationItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
