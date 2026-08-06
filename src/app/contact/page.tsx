import type { Metadata } from "next";

import { PublicInformationPage } from "@/components/public-information-page";
import { summitSite } from "@/lib/summit/site";

export const metadata: Metadata = {
  title: "Contact Us | Investment Summit",
  description: "Contact the Investment Summit registration team.",
};

export default function ContactPage() {
  const hasContact = summitSite.supportEmail || summitSite.supportPhone;

  return (
    <PublicInformationPage
      eyebrow="Support"
      title="Contact us"
      intro="Get help with registration, redeem codes, payments, cancellations, or event access."
    >
      <section>
        <h2>Registration support</h2>
        {hasContact ? (
          <div className="mt-3 space-y-2">
            {summitSite.supportEmail && (
              <p>
                Email: {" "}
                <a className="font-semibold text-[#6c3d72] hover:underline" href={`mailto:${summitSite.supportEmail}`}>
                  {summitSite.supportEmail}
                </a>
              </p>
            )}
            {summitSite.supportPhone && (
              <p>
                Phone: {" "}
                <a className="font-semibold text-[#6c3d72] hover:underline" href={`tel:${summitSite.supportPhone.replace(/\s/g, "")}`}>
                  {summitSite.supportPhone}
                </a>
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-[#fff4df] p-4 text-[#77531f]">
            The organiser’s support email and phone number will be published here before registrations open.
          </p>
        )}
      </section>

      <section>
        <h2>Response information</h2>
        <p className="mt-3">
          Include the attendee name, registered email address, and Razorpay payment reference when asking about a payment. Never send card numbers, UPI PINs, passwords, or one-time passwords.
        </p>
      </section>

      <section>
        <h2>Event organiser</h2>
        <p className="mt-3">{summitSite.organizer}</p>
      </section>
    </PublicInformationPage>
  );
}
