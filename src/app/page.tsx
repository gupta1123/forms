import { cookies } from "next/headers";

import { RegistrationForm } from "@/components/registration-form";
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
import type { RegistrationValues } from "@/lib/summit/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegistrationPage() {
  const cookieStore = await cookies();
  const checkoutToken = cookieStore.get(CHECKOUT_COOKIE_NAME)?.value;
  let initialValues: Partial<RegistrationValues> | null = null;

  if (isCheckoutToken(checkoutToken)) {
    const supabase = createSupabaseServiceClient();
    const { data: application } = await supabase
      .from("summit_applications")
      .select("status")
      .eq("checkout_token", checkoutToken)
      .maybeSingle();

    if (application?.status === "payment_pending") redirect("/plans");

    if (application?.status === "details_submitted") {
      const { data } = await supabase.rpc("get_summit_registration", {
        p_checkout_token: checkoutToken,
      });
      initialValues = Array.isArray(data) && data[0] ? data[0] : null;
    }
  }

  return (
    <main className="summit-app flex flex-col">
      <SummitHeader activeStep={1} />
      <SummitShell activeStep={1}>
        <section aria-labelledby="summit-panel-title" className="summit-panel">
          <SummitPanelHeader
            accent="attending?"
            description={
              <>
                These details help us prepare your registration. Fields marked
                <span className="summit-required">*</span> are required.
              </>
            }
            step="Step 1 of 3"
            title="Who's"
          />
          <div className="summit-panel-body">
            <RegistrationForm initialValues={initialValues} />
          </div>
        </section>
      </SummitShell>
      <SiteFooter />
    </main>
  );
}
