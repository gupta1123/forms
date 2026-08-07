import Link from "next/link";
import {
  PiArrowLeft,
  PiCheckCircle,
  PiEnvelopeSimple,
  PiIdentificationCard,
  PiReceipt,
  PiUser,
} from "react-icons/pi";

import type {
  AdminPaymentAttempt,
  AdminPaymentOrder,
  AdminRegistrationDetail as RegistrationDetail,
} from "@/lib/admin/types";
import { decodeSummitPreferences } from "@/lib/summit/preferences";

export function AdminRegistrationDetail({
  detail,
}: {
  detail: RegistrationDetail;
}) {
  const { registration } = detail;
  const preferences = decodeSummitPreferences(registration.summit_expectations);
  const reference = `IS-${String(registration.application_id).padStart(6, "0")}`;

  return (
    <div>
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--navy)] hover:text-[var(--brass)]"
        href="/admin"
      >
        <PiArrowLeft aria-hidden="true" /> Back to registrations
      </Link>

      <section className="overflow-hidden rounded-2xl border border-[var(--ink-16)] bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-[var(--ink-16)] bg-[var(--navy-deep)] px-5 py-6 text-white sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.12em] text-[var(--steel)]">
              {reference}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {registration.first_name} {registration.last_name}
            </h1>
            <p className="mt-2 text-sm text-white/65">
              Registered {formatDate(registration.created_at)}
            </p>
          </div>
          <RegistrationStatus
            mode={registration.payment_mode}
            status={registration.payment_status}
          />
        </div>

        <div className="grid gap-5 p-5 sm:p-7 xl:grid-cols-3">
          <DetailCard icon={<PiUser />} title="Attendee details">
            <DefinitionRow label="Email" value={registration.email} />
            <DefinitionRow label="Phone" value={registration.phone} />
            <DefinitionRow label="Place" value={registration.place} />
          </DetailCard>

          <DetailCard icon={<PiIdentificationCard />} title="Professional profile">
            <DefinitionRow label="Organisation / profession" value={registration.profession} />
            <DefinitionRow label="Designation" value={registration.designation} />
            <DefinitionRow label="Industry" value={registration.industry} />
          </DetailCard>

          <DetailCard icon={<PiReceipt />} title="Registration & pricing">
            <DefinitionRow label="Pass" value={registration.plan_name} />
            <DefinitionRow
              label="Original amount"
              value={formatRupees(registration.original_amount_paise)}
            />
            <DefinitionRow
              label="Discount"
              value={formatRupees(registration.discount_amount_paise)}
            />
            <DefinitionRow
              emphasis
              label={registration.payment_status === "paid" ? "Amount paid" : "Amount due"}
              value={formatRupees(registration.amount_due_paise)}
            />
            <DefinitionRow
              label="GST"
              value={registration.gst_included ? "Included" : "Not included"}
            />
            <DefinitionRow
              label="Redeem code"
              value={registration.redeem_code ?? "Not used"}
            />
          </DetailCard>
        </div>

        <div className="grid gap-5 border-t border-[var(--ink-16)] bg-[var(--paper)] p-5 sm:p-7 xl:grid-cols-2">
          <DetailCard title="Summit preferences">
            <DefinitionRow
              label="Participation purpose"
              value={preferences.purpose || "Not provided"}
            />
            <DefinitionRow
              label="Meeting requests"
              value={preferences.meetings.length > 0 ? preferences.meetings.join(" · ") : "None selected"}
            />
            <DefinitionRow
              label="Additional notes"
              value={preferences.notes || "Not provided"}
            />
          </DetailCard>

          <DetailCard title="Registration timeline">
            <DefinitionRow label="Created" value={formatDate(registration.created_at)} />
            <DefinitionRow label="Last updated" value={formatDate(registration.updated_at)} />
            <DefinitionRow
              label="Paid"
              value={registration.paid_at ? formatDate(registration.paid_at) : "Not paid yet"}
            />
          </DetailCard>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--paper-deep)] text-xl text-[var(--navy)]">
            <PiReceipt aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em]">Payment history</h2>
            <p className="text-sm text-[var(--ink-72)]">
              Razorpay orders, attempts, capture status, and provider errors.
            </p>
          </div>
        </div>

        {detail.payment_orders.length > 0 ? (
          <div className="space-y-5">
            {detail.payment_orders.map((order) => (
              <PaymentOrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <EmptyCard message="No Razorpay order has been created for this registration." />
        )}
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--paper-deep)] text-xl text-[var(--navy)]">
            <PiEnvelopeSimple aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Confirmation email
            </h2>
            <p className="text-sm text-[var(--ink-72)]">
              Delivery status for the payment confirmation message.
            </p>
          </div>
        </div>

        {detail.email_deliveries.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {detail.email_deliveries.map((delivery) => (
              <article
                className="rounded-2xl border border-[var(--ink-16)] bg-white p-5 shadow-sm"
                key={delivery.id}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold">Payment confirmation</p>
                  <SmallStatus status={delivery.status} />
                </div>
                <dl className="mt-4 divide-y divide-[var(--ink-16)] text-sm">
                  <DefinitionRow label="Recipient" value={delivery.recipient_email} />
                  <DefinitionRow
                    label="Sent"
                    value={delivery.sent_at ? formatDate(delivery.sent_at) : "Not sent"}
                  />
                  <DefinitionRow
                    label="Delivery attempts"
                    value={String(delivery.processing_attempts)}
                  />
                  {delivery.provider_message_id && (
                    <DefinitionRow label="Provider message ID" value={delivery.provider_message_id} />
                  )}
                  {delivery.last_error && (
                    <DefinitionRow label="Last error" value={delivery.last_error} />
                  )}
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <EmptyCard message="No confirmation email has been queued for this registration." />
        )}
      </section>
    </div>
  );
}

function PaymentOrderCard({ order }: { order: AdminPaymentOrder }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--ink-16)] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--ink-16)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Razorpay order</p>
          <p className="mt-1 break-all font-mono text-xs text-[var(--ink-48)]">
            {order.provider_order_id ?? `Local order ${order.id}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SmallStatus status={order.status} />
          <span className="rounded-full bg-[var(--paper-deep)] px-2.5 py-1 text-xs font-semibold uppercase text-[var(--navy)]">
            {order.key_mode}
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <dl className="divide-y divide-[var(--ink-16)] text-sm">
          <DefinitionRow label="Receipt" value={order.receipt} />
          <DefinitionRow label="Amount" value={formatRupees(order.amount_paise)} />
          <DefinitionRow label="Currency" value={order.currency} />
          <DefinitionRow label="Checkout attempts" value={String(order.attempts)} />
          <DefinitionRow label="Created" value={formatDate(order.created_at)} />
          <DefinitionRow
            label="Provider created"
            value={order.provider_created_at ? formatDate(order.provider_created_at) : "Not available"}
          />
          {order.last_error_code && (
            <DefinitionRow label="Last error code" value={order.last_error_code} />
          )}
          {order.last_error_description && (
            <DefinitionRow label="Last error" value={order.last_error_description} />
          )}
        </dl>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-48)]">
            Payment attempts
          </p>
          {order.payment_attempts.length > 0 ? (
            <div className="space-y-3">
              {order.payment_attempts.map((attempt) => (
                <PaymentAttemptCard attempt={attempt} key={attempt.id} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-[var(--paper)] p-4 text-sm text-[var(--ink-48)]">
              No payment attempt has been recorded.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function PaymentAttemptCard({ attempt }: { attempt: AdminPaymentAttempt }) {
  const errors = [
    attempt.error_code,
    attempt.error_description,
    attempt.error_source,
    attempt.error_step,
    attempt.error_reason,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-[var(--ink-16)] bg-[var(--paper)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="break-all font-mono text-xs font-semibold text-[var(--ink)]">
            {attempt.provider_payment_id}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-48)]">
            {formatDate(attempt.created_at)}
          </p>
        </div>
        <SmallStatus status={attempt.status} />
      </div>
      <dl className="mt-3 divide-y divide-[var(--ink-16)] text-sm">
        <DefinitionRow label="Amount" value={formatRupees(attempt.amount_paise)} />
        <DefinitionRow label="Method" value={formatMethod(attempt.method)} />
        <DefinitionRow
          label="Signature"
          value={attempt.signature_verified_at ? "Verified" : "Not verified"}
        />
        <DefinitionRow
          label="Captured"
          value={attempt.captured_at ? formatDate(attempt.captured_at) : "Not captured"}
        />
        {errors.length > 0 && <DefinitionRow label="Provider error" value={errors.join(" · ")} />}
      </dl>
    </div>
  );
}

function DetailCard({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--ink-16)] bg-white p-5">
      <div className="mb-4 flex items-center gap-2 text-[var(--navy)]">
        {icon && <span className="text-xl">{icon}</span>}
        <h2 className="font-semibold">{title}</h2>
      </div>
      <dl className="divide-y divide-[var(--ink-16)] text-sm">{children}</dl>
    </article>
  );
}

function DefinitionRow({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[minmax(110px,0.75fr)_minmax(0,1.25fr)] sm:gap-4">
      <dt className="text-[var(--ink-48)]">{label}</dt>
      <dd
        className={`break-words sm:text-right ${
          emphasis ? "font-semibold text-[var(--navy)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function RegistrationStatus({
  mode,
  status,
}: {
  mode: RegistrationDetail["registration"]["payment_mode"];
  status: RegistrationDetail["registration"]["payment_status"];
}) {
  const label =
    status === "paid"
      ? "Payment complete"
      : status === "payment_pending"
        ? "Payment pending"
        : status === "cancelled"
          ? "Cancelled"
          : "Payment not started";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
        {status === "paid" && <PiCheckCircle aria-hidden="true" />}
        {label}
      </span>
      {mode && (
        <span className="rounded-full bg-[var(--brass)] px-3 py-2 text-xs font-semibold uppercase text-white">
          {mode} mode
        </span>
      )}
    </div>
  );
}

function SmallStatus({ status }: { status: string }) {
  const successful = ["paid", "captured", "sent"].includes(status);
  const failed = ["failed", "creation_failed", "cancelled"].includes(status);
  const className = successful
    ? "bg-[#e7f4f5] text-[#0b6f75]"
    : failed
      ? "bg-[#fff0ed] text-[#9a4637]"
      : "bg-[#fff4df] text-[#8b6023]";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--ink-16)] bg-white p-7 text-sm text-[var(--ink-48)]">
      {message}
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
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formatMethod(method: string | null) {
  if (!method) return "Not available";
  return method
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
