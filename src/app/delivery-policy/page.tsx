import type { Metadata } from "next";

import { PublicInformationPage } from "@/components/public-information-page";
import { summitSite } from "@/lib/summit/site";

export const metadata: Metadata = {
  title: "Shipping and Delivery Policy | Industrial Summit",
  description: "How Industrial Summit registration confirmation and access are delivered.",
};

export default function DeliveryPolicyPage() {
  return (
    <PublicInformationPage
      eyebrow="Fulfilment"
      title="Shipping and delivery policy"
      intro="The summit pass is an event registration; no physical product is shipped as part of the standard purchase."
    >
      <section>
        <h2>Registration confirmation</h2>
        <p className="mt-3">
          After successful payment verification, the website displays a confirmation page and emails the registration and payment references to the registered email address. The same address may also be used for event communications.
        </p>
      </section>

      <section>
        <h2>Event access</h2>
        <p className="mt-3"><strong>Date:</strong> {summitSite.eventDate}</p>
        <p className="mt-2"><strong>Location or access:</strong> {summitSite.eventLocation}</p>
        <p className="mt-3">
          Final check-in, venue, or online access instructions will be sent or made available to confirmed attendees before the event.
        </p>
      </section>

      <section>
        <h2>Delivery problems</h2>
        <p className="mt-3">
          If payment was captured but confirmation is not visible, use the Contact Us page and provide the registered email address and Razorpay payment reference. Do not make another payment until support checks the first attempt.
        </p>
      </section>
    </PublicInformationPage>
  );
}
