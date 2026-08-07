import type { Metadata } from "next";

import { PublicInformationPage } from "@/components/public-information-page";

export const metadata: Metadata = {
  title: "Cancellation and Refund Policy | Industrial Summit",
  description: "Industrial Summit cancellation and refund process.",
};

export default function RefundPolicyPage() {
  return (
    <PublicInformationPage
      eyebrow="Payments"
      title="Cancellation and refund policy"
      intro="This policy explains how cancellation, duplicate-payment, and organiser-cancellation requests are handled."
    >
      <section>
        <h2>Attendee cancellations</h2>
        <p className="mt-3">
          Registration fees are non-refundable for attendee cancellations or non-attendance unless a different written commitment was provided by the organiser or a refund is required by applicable law.
        </p>
      </section>

      <section>
        <h2>Cancellation by the organiser</h2>
        <p className="mt-3">
          If the organiser cancels the summit and does not provide a replacement date or equivalent access, the registration amount paid will be eligible for refund to the original payment method.
        </p>
      </section>

      <section>
        <h2>Rescheduling</h2>
        <p className="mt-3">
          If the summit is rescheduled, the registration will remain valid for the replacement date. Any additional refund option offered for a material schedule change will be communicated to registered attendees.
        </p>
      </section>

      <section>
        <h2>Duplicate or incorrect charges</h2>
        <p className="mt-3">
          Contact the registration team promptly with the attendee email and Razorpay payment reference. Verified duplicate captures or incorrect amounts will be corrected or refunded.
        </p>
      </section>

      <section>
        <h2>Refund processing</h2>
        <p className="mt-3">
          Approved refunds are initiated to the original payment method. Banks and payment providers control the final posting time, which may take approximately 7–10 working days after initiation.
        </p>
      </section>
    </PublicInformationPage>
  );
}
