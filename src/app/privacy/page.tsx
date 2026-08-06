import type { Metadata } from "next";

import { PublicInformationPage } from "@/components/public-information-page";
import { summitSite } from "@/lib/summit/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Investment Summit",
  description: "How Investment Summit registration information is collected and used.",
};

export default function PrivacyPage() {
  return (
    <PublicInformationPage
      eyebrow="Last updated 6 August 2026"
      title="Privacy policy"
      intro={`${summitSite.organizer} uses attendee information only for operating the Investment Summit and related registration support.`}
    >
      <section>
        <h2>Information we collect</h2>
        <ul className="mt-3">
          <li>Name, phone number, email address, industry, profession, designation, and place.</li>
          <li>Your optional response about what you hope to gain from the summit.</li>
          <li>Registration price, redeem-code usage, payment status, and Razorpay payment references.</li>
          <li>Basic technical and security information generated when you use the website.</li>
        </ul>
      </section>

      <section>
        <h2>How we use information</h2>
        <ul className="mt-3">
          <li>Process and confirm registrations and payments.</li>
          <li>Provide event information, access details, and attendee support.</li>
          <li>Prevent fraud, investigate payment issues, and maintain accurate records.</li>
          <li>Meet accounting, tax, legal, and regulatory obligations.</li>
        </ul>
      </section>

      <section>
        <h2>Payments and service providers</h2>
        <p className="mt-3">
          Razorpay processes payment credentials in its secure checkout; this website does not store card numbers, CVVs, UPI PINs, or banking passwords. Registration records are stored using Supabase, and the website’s hosting provider processes requests needed to deliver the service. These providers process information under their own security and privacy obligations.
        </p>
      </section>

      <section>
        <h2>Retention and security</h2>
        <p className="mt-3">
          Information is retained only as long as reasonably necessary for event operations, support, dispute handling, and legal recordkeeping. Access to attendee records is restricted to approved administrators.
        </p>
      </section>

      <section>
        <h2>Your requests</h2>
        <p className="mt-3">
          Use the Contact Us page to request access, correction, or deletion of your information. Some records may need to be retained where required for payments, taxation, fraud prevention, disputes, or other legal obligations.
        </p>
      </section>
    </PublicInformationPage>
  );
}
