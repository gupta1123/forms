import type { Metadata } from "next";

import { PublicInformationPage } from "@/components/public-information-page";
import { summitSite } from "@/lib/summit/site";

export const metadata: Metadata = {
  title: "Terms and Conditions | Industrial Summit",
  description: "Terms governing Industrial Summit registration and attendance.",
};

export default function TermsPage() {
  return (
    <PublicInformationPage
      eyebrow="Last updated 6 August 2026"
      title="Terms and conditions"
      intro={`These terms govern registration for and participation in the Industrial Summit organised by ${summitSite.organizer}.`}
    >
      <section>
        <h2>Registration</h2>
        <p className="mt-3">
          You must provide accurate attendee and contact information. A registration is confirmed only after the applicable amount is successfully captured and the confirmation page is displayed.
        </p>
      </section>

      <section>
        <h2>Pricing and payment</h2>
        <p className="mt-3">
          The displayed price includes applicable GST. Payments are processed by Razorpay. A redeem code must be valid and applied before payment starts; it has no cash value and cannot be combined or transferred unless the organiser expressly permits it.
        </p>
      </section>

      <section>
        <h2>Event changes</h2>
        <p className="mt-3">
          The organiser may make reasonable changes to the schedule, venue, speakers, programme, or delivery format. Material cancellation or rescheduling will be handled under the published cancellation and refund policy.
        </p>
      </section>

      <section>
        <h2>Attendee conduct</h2>
        <p className="mt-3">
          Attendees must follow venue, safety, access, and conduct rules. The organiser may refuse or withdraw access for unlawful, unsafe, disruptive, fraudulent, or abusive conduct.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p className="mt-3">
          Summit information is educational and does not constitute investment, legal, tax, or financial advice. To the extent permitted by law, the organiser is not responsible for decisions made solely from event content or for circumstances outside its reasonable control.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p className="mt-3">Questions about these terms can be submitted through the Contact Us page.</p>
      </section>
    </PublicInformationPage>
  );
}
