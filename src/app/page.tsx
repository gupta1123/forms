import { cookies } from "next/headers";

import { RegistrationEntry } from "@/components/registration-entry";
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
import type {
  CorporateRegistrationValues,
  RegistrationValues,
} from "@/lib/summit/validation";
import { registrationValuesFromStored } from "@/lib/summit/preferences";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; registration?: string }>;
}) {
  const { mode, registration } = await searchParams;
  const cookieStore = await cookies();
  const checkoutToken = cookieStore.get(CHECKOUT_COOKIE_NAME)?.value;
  let initialValues: Partial<RegistrationValues> | null = null;
  let corporateInitialValues: Partial<CorporateRegistrationValues> | null = null;
  let registrationType: "individual" | "corporate" =
    registration === "corporate" ? "corporate" : "individual";

  if (isCheckoutToken(checkoutToken)) {
    const supabase = createSupabaseServiceClient();
    const { data: application } = await supabase
      .from("summit_applications")
      .select("status, registration_type, first_name, last_name, phone, company_name, attendee_count")
      .eq("checkout_token", checkoutToken)
      .maybeSingle();

    if (application?.status === "payment_pending") redirect("/plans");

    if (application?.status === "details_submitted") {
      registrationType = application.registration_type === "corporate" ? "corporate" : "individual";
      if (registrationType === "corporate") {
        corporateInitialValues = {
          first_name: application.first_name,
          last_name: application.last_name,
          phone: application.phone,
          company_name: application.company_name ?? "",
          attendee_count: application.attendee_count ?? 2,
        };
      } else {
        const { data } = await supabase.rpc("get_summit_registration", {
          p_checkout_token: checkoutToken,
        });
        initialValues =
          Array.isArray(data) && data[0]
            ? registrationValuesFromStored(data[0])
            : null;
      }
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
                {registrationType === "corporate"
                  ? "Register your company group with one primary contact. Fields marked"
                  : "This is what goes on your badge. Fields marked"}
                <span className="summit-required">*</span> are required.
              </>
            }
            step="Step 1 of 3"
            title="Who's"
          />
          <div className="summit-panel-body">
            <RegistrationEntry
              initialValues={initialValues}
              corporateInitialValues={corporateInitialValues}
              lookupMode={mode === "lookup"}
              registrationType={registrationType}
            />
          </div>
        </section>
      </SummitShell>
      <SiteFooter />
    </main>
  );
}
