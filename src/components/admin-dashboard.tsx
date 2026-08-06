"use client";

import { useMemo, useState } from "react";

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
    });
  }, [codeUsage, data.registrations, paymentStatus, search]);

  const total = data.metrics.total_registrations;

  return (
    <section className="rounded-2xl border border-[#e2dee6] bg-white shadow-sm">
        <div className="border-b border-[#ebe8ed] p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#302a36]">Registration details</h2>
              <p className="mt-1 text-sm text-[#817b86]">Showing {filteredRegistrations.length} of {total} registrations</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_170px_160px]">
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
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ebe8ed] bg-[#faf9fb] text-xs font-semibold uppercase tracking-[0.08em] text-[#89828e]">
                <th className="px-5 py-3.5">Attendee</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Professional details</th>
                <th className="px-5 py-3.5">Place</th>
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
                  <td className="px-5 py-14 text-center text-sm text-[#847e89]" colSpan={8}>No registrations match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > data.registrations.length && (
          <p className="border-t border-[#ebe8ed] px-5 py-3 text-xs text-[#8a8490]">The dashboard displays the newest {data.registrations.length} registrations. Totals include every registration.</p>
        )}
    </section>
  );
}

function RegistrationRow({ registration }: { registration: AdminRegistration }) {
  return (
    <tr className="border-b border-[#efecf0] align-top text-sm last:border-0 hover:bg-[#fcfbfd]">
      <td className="px-5 py-4">
        <p className="font-semibold text-[#332e37]">{registration.first_name} {registration.last_name}</p>
        {registration.summit_expectations && (
          <details className="mt-2 max-w-48 text-xs text-[#746a79]">
            <summary className="cursor-pointer font-medium text-[#6c3d72]">Summit expectations</summary>
            <p className="mt-2 whitespace-pre-wrap leading-5">{registration.summit_expectations}</p>
          </details>
        )}
      </td>
      <td className="px-5 py-4 text-[#625c66]"><p>{registration.email}</p><p className="mt-1">{registration.phone}</p></td>
      <td className="px-5 py-4"><p className="font-medium text-[#464049]">{registration.designation}</p><p className="mt-1 text-[#77717a]">{registration.profession} · {registration.industry}</p></td>
      <td className="px-5 py-4 text-[#625c66]">{registration.place}</td>
      <td className="px-5 py-4">{registration.redeem_code ? <span className="rounded-full bg-[#fbf1e4] px-2.5 py-1 text-xs font-semibold text-[#956026]">{registration.redeem_code}</span> : <span className="text-xs text-[#9a949e]">Standard</span>}</td>
      <td className="px-5 py-4"><p className="font-semibold text-[#3c3640]">{formatRupees(registration.amount_due_paise)}</p>{registration.discount_amount_paise > 0 && <p className="mt-1 text-xs text-[#3f8055]">Saved {formatRupees(registration.discount_amount_paise)}</p>}</td>
      <td className="px-5 py-4">
        <PaymentBadge mode={registration.payment_mode} status={registration.payment_status} />
        {(registration.razorpay_order_id || registration.razorpay_payment_id) && (
          <details className="mt-2 max-w-44 text-xs text-[#746a79]">
            <summary className="cursor-pointer font-medium text-[#6c3d72]">Payment details</summary>
            <dl className="mt-2 space-y-1 break-all leading-5">
              {registration.payment_method && <div><dt className="inline font-medium">Method: </dt><dd className="inline">{registration.payment_method}</dd></div>}
              {registration.provider_payment_status && <div><dt className="inline font-medium">Provider: </dt><dd className="inline">{registration.provider_payment_status}</dd></div>}
              {registration.razorpay_order_id && <div><dt className="inline font-medium">Order: </dt><dd className="inline">{registration.razorpay_order_id}</dd></div>}
              {registration.razorpay_payment_id && <div><dt className="inline font-medium">Payment: </dt><dd className="inline">{registration.razorpay_payment_id}</dd></div>}
            </dl>
          </details>
        )}
      </td>
      <td className="px-5 py-4 text-xs leading-5 text-[#77717a]">{formatDate(registration.created_at)}</td>
    </tr>
  );
}

function PaymentBadge({ mode, status }: { mode: AdminRegistration["payment_mode"]; status: AdminRegistration["payment_status"] }) {
  const styles = {
    details_submitted: { label: "Not started", className: "bg-[#f0edf2] text-[#6e6872]" },
    payment_pending: { label: "Pending", className: "bg-[#fff4df] text-[#8b6023]" },
    paid: { label: "Paid", className: "bg-[#eaf6ed] text-[#34704a]" },
    cancelled: { label: "Cancelled", className: "bg-[#fff0ed] text-[#9a4637]" },
  };
  const current = styles[status];
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${current.className}`}>{current.label}</span>
      {mode && <span className="rounded-full bg-[#eef1f7] px-2.5 py-1 text-xs font-semibold uppercase text-[#5c6578]">{mode}</span>}
    </div>
  );
}

function formatRupees(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
