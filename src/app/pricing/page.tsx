import type { Metadata } from "next";
import Link from "next/link";

import { PublicInformationPage } from "@/components/public-information-page";
import { summitSite } from "@/lib/summit/site";

export const metadata: Metadata = {
  title: "Pricing | Investment Summit",
  description: "Investment Summit registration pricing and inclusions.",
};

export default function PricingPage() {
  return (
    <PublicInformationPage
      eyebrow="Summit pass"
      title="Clear, inclusive pricing"
      intro="Review the registration price before submitting your details or opening Razorpay Checkout."
    >
      <section className="rounded-2xl bg-[var(--navy-deep)] p-6 text-white sm:p-8">
        <p className="!text-sm !text-white/60">Investment Summit Pass</p>
        <p className="mt-2 !text-4xl !font-semibold !text-white">₹2,999</p>
        <p className="mt-2 !text-sm !text-white/60">Inclusive of applicable GST</p>
        <ul className="mt-6 !text-white/75">
          <li>One attendee registration for the Investment Summit</li>
          <li>Access according to the confirmed event schedule and venue</li>
          <li>Secure payment through Razorpay Checkout</li>
        </ul>
      </section>

      <section>
        <h2>Redeem-code pricing</h2>
        <p className="mt-3">
          Eligible attendees may enter a valid redeem code before payment. A valid ₹600 discount changes the total to ₹2,399, inclusive of GST. Codes cannot be added after Razorpay Checkout has started.
        </p>
      </section>

      <section>
        <h2>Event information</h2>
        <p className="mt-3"><strong>Date:</strong> {summitSite.eventDate}</p>
        <p className="mt-2"><strong>Location:</strong> {summitSite.eventLocation}</p>
      </section>

      <Link className="button-primary inline-flex h-12 items-center px-5" href="/">
        Start registration
      </Link>
    </PublicInformationPage>
  );
}
