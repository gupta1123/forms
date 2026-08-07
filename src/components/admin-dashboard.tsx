"use client";

import { useMemo, useState } from "react";
import { PiDownloadSimple, PiSpinnerGap } from "react-icons/pi";

import { exportRegistrationsToExcel } from "@/lib/admin/export-registrations";
import { decodeSummitPreferences } from "@/lib/summit/preferences";

export type AdminRegistration = {
  application_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  industry: string;
  profession: string;
  designation: string;
  place: string;
  summit_expectations: string | null;
  plan_name: string;
  redeem_code: string | null;
  original_amount_paise: number;
  amount_due_paise: number;
  discount_amount_paise: number;
  payment_status: "details_submitted" | "payment_pending" | "paid" | "cancelled";
  payment_mode: "test" | "live" | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  provider_payment_status: "created" | "authorized" | "captured" | "refunded" | "failed" | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminDashboardData = {
  generated_at: string;
  source: string;
  metrics: {
    total_registrations: number;
    redeem_code_registrations: number;
    paid_registrations: number;
    live_paid_registrations: number;
    test_paid_registrations: number;
    awaiting_payment: number;
    collected_paise: number;
    test_collected_paise: number;
    expected_paise: number;
  };
  registrations: AdminRegistration[];
};

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [codeUsage, setCodeUsage] = useState("all");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const filteredRegistrations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return data.registrations.filter((registration) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          registration.first_name,
          registration.last_name,
          registration.email,
          registration.phone,
          registration.industry,
          registration.profession,
          registration.designation,
          registration.place,
          decodeSummitPreferences(registration.summit_expectations).purpose,
          registration.redeem_code ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesPayment =
        paymentStatus === "all" ||
        (paymentStatus === "awaiting" &&
          ["details_submitted", "payment_pending"].includes(
            registration.payment_status,
          )) ||
        registration.payment_status === paymentStatus;

      const matchesCode =
        codeUsage === "all" ||
        (codeUsage === "redeemed" && Boolean(registration.redeem_code)) ||
        (codeUsage === "standard" && !registration.redeem_code);

      return matchesSearch && matchesPayment && matchesCode;
    }).sort((left, right) => {
      const difference =
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return sortOrder === "recent" ? difference : -difference;
    });
  }, [codeUsage, data.registrations, paymentStatus, search, sortOrder]);

  async function handleExport() {
    setExporting(true);
    setExportError("");

    try {
      await exportRegistrationsToExcel(filteredRegistrations);
    } catch {
      setExportError("The Excel file could not be created. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const total = data.metrics.total_registrations;

  return (
    <section className="rounded-2xl border border-[var(--ink-16)] bg-white shadow-sm">
        <div className="border-b border-[var(--ink-16)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">Registration details</h2>
              <p className="mt-1 text-sm text-[var(--ink-72)]">Showing {filteredRegistrations.length} of {total} registrations · {sortOrder === "recent" ? "recent first" : "oldest first"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_170px_160px_160px_auto]">
              <label className="sr-only" htmlFor="admin-search">Search registrations</label>
              <input className="field-input h-10" id="admin-search" type="search" placeholder="Search name, email, phone..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <label className="sr-only" htmlFor="payment-filter">Payment status</label>
              <select className="field-input h-10" id="payment-filter" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                <option value="all">All payments</option>
                <option value="awaiting">Awaiting payment</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <label className="sr-only" htmlFor="code-filter">Redeem-code usage</label>
              <select className="field-input h-10" id="code-filter" value={codeUsage} onChange={(event) => setCodeUsage(event.target.value)}>
                <option value="all">All pricing</option>
                <option value="redeemed">Code applied</option>
                <option value="standard">Standard price</option>
              </select>
              <label className="sr-only" htmlFor="sort-order">Sort order</label>
              <select className="field-input h-10" id="sort-order" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "recent" | "oldest")}>
                <option value="recent">Recent first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <button className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[var(--navy)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--navy-deep)] disabled:cursor-wait disabled:opacity-60" type="button" onClick={handleExport} disabled={exporting}>
                {exporting ? <PiSpinnerGap aria-hidden="true" className="animate-spin" /> : <PiDownloadSimple aria-hidden="true" />}
                {exporting ? "Preparing..." : "Export Excel"}
              </button>
            </div>
          </div>
          {exportError && <p className="mt-3 text-sm text-[#a8422c]" role="alert">{exportError}</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--ink-16)] bg-[var(--paper)] text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-48)]">
                <th className="px-5 py-3.5">Attendee</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Organisation</th>
                <th className="px-5 py-3.5">City</th>
                <th className="px-5 py-3.5">Redeem code</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Registered</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((registration) => (
                <RegistrationRow registration={registration} key={registration.application_id} />
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td className="px-5 py-14 text-center text-sm text-[var(--ink-48)]" colSpan={8}>No registrations match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > data.registrations.length && (
          <p className="border-t border-[var(--ink-16)] px-5 py-3 text-xs text-[var(--ink-48)]">The dashboard displays the newest {data.registrations.length} registrations. Totals include every registration.</p>
        )}
    </section>
  );
}

function RegistrationRow({ registration }: { registration: AdminRegistration }) {
  const preferences = decodeSummitPreferences(registration.summit_expectations);
  const hasPreferences = Boolean(
    preferences.purpose || preferences.meetings.length || preferences.notes,
  );

  return (
    <tr className="border-b border-[var(--ink-16)] align-top text-sm last:border-0 hover:bg-[var(--paper)]">
      <td className="px-5 py-4">
        <p className="font-semibold text-[var(--ink)]">{registration.first_name} {registration.last_name}</p>
        {hasPreferences && (
          <details className="mt-2 max-w-48 text-xs text-[var(--ink-72)]">
            <summary className="cursor-pointer font-medium text-[var(--navy)]">Summit preferences</summary>
            <div className="mt-2 space-y-2 leading-5">
              {preferences.purpose && <p><strong>Purpose:</strong> {preferences.purpose}</p>}
              {preferences.meetings.length > 0 && <p><strong>Meetings:</strong> {preferences.meetings.join(" · ")}</p>}
              {preferences.notes && <p className="whitespace-pre-wrap"><strong>Notes:</strong> {preferences.notes}</p>}
            </div>
          </details>
        )}
      </td>
      <td className="px-5 py-4 text-[var(--ink-72)]"><p>{registration.email}</p><p className="mt-1">{registration.phone}</p></td>
      <td className="px-5 py-4"><p className="font-medium text-[var(--ink)]">{registration.profession}</p><p className="mt-1 text-[var(--ink-72)]">{registration.designation} · {registration.industry}</p></td>
      <td className="px-5 py-4 text-[var(--ink-72)]">{registration.place}</td>
      <td className="px-5 py-4">{registration.redeem_code ? <span className="rounded-full bg-[var(--paper-deep)] px-2.5 py-1 text-xs font-semibold text-[var(--navy)]">{registration.redeem_code}</span> : <span className="text-xs text-[var(--ink-48)]">Standard</span>}</td>
      <td className="px-5 py-4"><p className="font-semibold text-[var(--ink)]">{formatRupees(registration.amount_due_paise)}</p>{registration.discount_amount_paise > 0 && <p className="mt-1 text-xs text-[var(--seed)]">Saved {formatRupees(registration.discount_amount_paise)}</p>}</td>
      <td className="px-5 py-4">
        <PaymentBadge mode={registration.payment_mode} status={registration.payment_status} />
        {(registration.razorpay_order_id || registration.razorpay_payment_id) && (
          <details className="mt-2 max-w-44 text-xs text-[var(--ink-72)]">
            <summary className="cursor-pointer font-medium text-[var(--navy)]">Payment details</summary>
            <dl className="mt-2 space-y-1 break-all leading-5">
              {registration.payment_method && <div><dt className="inline font-medium">Method: </dt><dd className="inline">{registration.payment_method}</dd></div>}
              {registration.provider_payment_status && <div><dt className="inline font-medium">Provider: </dt><dd className="inline">{registration.provider_payment_status}</dd></div>}
              {registration.razorpay_order_id && <div><dt className="inline font-medium">Order: </dt><dd className="inline">{registration.razorpay_order_id}</dd></div>}
              {registration.razorpay_payment_id && <div><dt className="inline font-medium">Payment: </dt><dd className="inline">{registration.razorpay_payment_id}</dd></div>}
            </dl>
          </details>
        )}
      </td>
      <td className="px-5 py-4 text-xs leading-5 text-[var(--ink-72)]">{formatDate(registration.created_at)}</td>
    </tr>
  );
}

function PaymentBadge({ mode, status }: { mode: AdminRegistration["payment_mode"]; status: AdminRegistration["payment_status"] }) {
  const styles = {
    details_submitted: { label: "Not started", className: "bg-[var(--paper-deep)] text-[var(--ink-72)]" },
    payment_pending: { label: "Pending", className: "bg-[#fff4df] text-[#8b6023]" },
    paid: { label: "Paid", className: "bg-[#e7f4f5] text-[#0b6f75]" },
    cancelled: { label: "Cancelled", className: "bg-[#fff0ed] text-[#9a4637]" },
  };
  const current = styles[status];
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${current.className}`}>{current.label}</span>
      {mode && <span className="rounded-full bg-[#e4f2f4] px-2.5 py-1 text-xs font-semibold uppercase text-[var(--navy)]">{mode}</span>}
    </div>
  );
}

function formatRupees(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
