"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PiArrowLeft,
  PiArrowRight,
  PiDownloadSimple,
  PiEye,
  PiMagnifyingGlass,
  PiSpinnerGap,
} from "react-icons/pi";

import { getAdminRegistrationExport } from "@/app/admin/actions";
import { exportRegistrationsToExcel } from "@/lib/admin/export-registrations";
import type {
  AdminDashboardData,
  AdminListFilters,
  AdminRegistration,
} from "@/lib/admin/types";

export type { AdminDashboardData } from "@/lib/admin/types";

export function AdminDashboard({
  data,
  filters,
}: {
  data: AdminDashboardData;
  filters: AdminListFilters;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleExport() {
    setExporting(true);
    setExportError("");

    try {
      const registrations = await getAdminRegistrationExport({
        search: filters.search,
        payment: filters.payment,
        pricing: filters.pricing,
        sort: filters.sort,
      });
      await exportRegistrationsToExcel(registrations);
    } catch {
      setExportError("The Excel file could not be created. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const previousHref = paginationHref(filters, {
    cursor: data.pagination.previousCursor,
    direction: "previous",
  });
  const nextHref = paginationHref(filters, {
    cursor: data.pagination.nextCursor,
    direction: "next",
  });

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--ink-16)] bg-white shadow-sm">
      <div className="border-b border-[var(--ink-16)] p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)]">
                Registration list
              </h2>
              <p className="mt-0.5 text-[14px] leading-5 text-[var(--ink-72)]">
                {data.pagination.totalMatches} matching registrations ·{" "}
                {filters.sort === "recent" ? "recent first" : "oldest first"}
              </p>
            </div>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 self-start whitespace-nowrap rounded-lg bg-[var(--navy)] px-3.5 text-[15px] font-semibold text-white transition hover:bg-[var(--navy-deep)] disabled:cursor-wait disabled:opacity-60 sm:self-auto"
              disabled={exporting || data.registrations.length === 0}
              onClick={handleExport}
              type="button"
            >
              {exporting ? (
                <PiSpinnerGap aria-hidden="true" className="animate-spin" />
              ) : (
                <PiDownloadSimple aria-hidden="true" />
              )}
              {exporting ? "Preparing..." : "Export Excel"}
            </button>
          </div>

          <form
            action="/admin"
            className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_150px_145px_140px_auto_auto]"
            method="get"
          >
            <label className="relative sm:col-span-2 xl:col-span-1" htmlFor="admin-search">
              <span className="sr-only">Search registrations</span>
              <PiMagnifyingGlass
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-48)]"
              />
              <input
                className="field-input h-9 pl-10 text-[15px]"
                defaultValue={filters.search}
                id="admin-search"
                name="q"
                placeholder="Name, email, phone, organisation..."
                type="search"
              />
            </label>
            <label className="sr-only" htmlFor="payment-filter">
              Payment status
            </label>
            <select
              className="field-input h-9 text-[15px]"
              defaultValue={filters.payment}
              id="payment-filter"
              name="payment"
            >
              <option value="all">All payments</option>
              <option value="awaiting">Awaiting payment</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <label className="sr-only" htmlFor="code-filter">
              Redeem-code usage
            </label>
            <select
              className="field-input h-9 text-[15px]"
              defaultValue={filters.pricing}
              id="code-filter"
              name="pricing"
            >
              <option value="all">All pricing</option>
              <option value="redeemed">Code applied</option>
              <option value="standard">Standard price</option>
            </select>
            <label className="sr-only" htmlFor="sort-order">
              Sort order
            </label>
            <select
              className="field-input h-9 text-[15px]"
              defaultValue={filters.sort}
              id="sort-order"
              name="sort"
            >
              <option value="recent">Recent first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--navy)] px-3.5 text-[15px] font-semibold text-white transition hover:bg-[var(--navy-deep)]"
              type="submit"
            >
              Apply
            </button>
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--ink-16)] px-3.5 text-[15px] font-semibold text-[var(--ink-72)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
              href="/admin"
            >
              Clear
            </Link>
          </form>
          {exportError && (
            <p className="text-sm text-[#a8422c]" role="alert">
              {exportError}
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[17%]" />
            <col className="w-[20%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--ink-16)] bg-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-48)]">
              <th className="px-3 py-2.5">Attendee</th>
              <th className="px-3 py-2.5">Contact</th>
              <th className="px-3 py-2.5">Organisation</th>
              <th className="px-3 py-2.5">City</th>
              <th className="px-3 py-2.5">Pricing</th>
              <th className="px-3 py-2.5">Amount</th>
              <th className="px-3 py-2.5">Payment</th>
              <th className="px-3 py-2.5">Registered</th>
              <th className="px-3 py-2.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.registrations.map((registration) => (
              <RegistrationRow
                key={registration.application_id}
                registration={registration}
              />
            ))}
            {data.registrations.length === 0 && (
              <tr>
                <td
                  className="px-5 py-14 text-center text-sm text-[var(--ink-48)]"
                  colSpan={9}
                >
                  No registrations match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--ink-16)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] text-[var(--ink-48)]">
          Showing {data.registrations.length} on this page ·{" "}
          {data.pagination.totalMatches} total matches
        </p>
        <nav aria-label="Registration pagination" className="flex items-center gap-2">
          {data.pagination.hasPrevious ? (
            <Link className="admin-page-button" href={previousHref}>
              <PiArrowLeft aria-hidden="true" /> Previous
            </Link>
          ) : (
            <span aria-disabled="true" className="admin-page-button opacity-40">
              <PiArrowLeft aria-hidden="true" /> Previous
            </span>
          )}
          {data.pagination.hasNext ? (
            <Link className="admin-page-button" href={nextHref}>
              Next <PiArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <span aria-disabled="true" className="admin-page-button opacity-40">
              Next <PiArrowRight aria-hidden="true" />
            </span>
          )}
        </nav>
      </div>
    </section>
  );
}

function RegistrationRow({ registration }: { registration: AdminRegistration }) {
  const detailHref = `/admin/${registration.application_id}`;

  return (
    <tr className="border-b border-[var(--ink-16)] align-top text-[15px] leading-5 last:border-0 hover:bg-[var(--paper)]">
      <td className="px-3 py-3">
        <Link className="font-semibold text-[var(--ink)] hover:text-[var(--brass)]" href={detailHref}>
          {registration.first_name} {registration.last_name}
        </Link>
        <p className="mt-0.5 font-mono text-[12px] text-[var(--ink-48)]">
          IS-{String(registration.application_id).padStart(6, "0")}
        </p>
        <p className="mt-0.5 text-[13px] font-semibold capitalize text-[var(--brass)]">
          {registration.registration_type} · {registration.attendee_count} {registration.attendee_count === 1 ? "person" : "people"}
        </p>
      </td>
      <td className="break-words px-3 py-3 text-[var(--ink-72)]">
        <p className="break-all">{registration.email ?? "No email collected"}</p>
        <p className="mt-0.5">{registration.phone}</p>
      </td>
      <td className="break-words px-3 py-3">
        <p className="font-medium text-[var(--ink)]">{registration.company_name ?? registration.profession}</p>
        <p className="mt-0.5 text-[var(--ink-72)]">
          {registration.registration_type === "corporate"
            ? "Corporate registration"
            : `${registration.designation} · ${registration.industry}`}
        </p>
      </td>
      <td className="break-words px-3 py-3 text-[var(--ink-72)]">{registration.place}</td>
      <td className="px-3 py-3">
        {registration.redeem_code ? (
          <span className="rounded-full bg-[var(--paper-deep)] px-2.5 py-1 text-xs font-semibold text-[var(--navy)]">
            {registration.redeem_code}
          </span>
        ) : (
          <span className="text-[13px] text-[var(--ink-48)]">Standard</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <p className="font-semibold text-[var(--ink)]">
          {formatRupees(registration.amount_due_paise)}
        </p>
        {registration.discount_amount_paise > 0 && (
          <p className="mt-1 text-xs text-[var(--seed)]">
            Saved {formatRupees(registration.discount_amount_paise)}
          </p>
        )}
      </td>
      <td className="px-3 py-3">
        <PaymentBadge mode={registration.payment_mode} status={registration.payment_status} />
      </td>
      <td className="px-3 py-3 text-[13px] leading-[1.35] text-[var(--ink-72)]">
        {formatDate(registration.created_at)}
      </td>
      <td className="px-3 py-3 text-right">
        <Link
          aria-label={`View ${registration.first_name}`}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--ink-16)] text-[var(--navy)] transition hover:border-[var(--navy)] hover:bg-[var(--paper-deep)]"
          href={detailHref}
        >
          <PiEye aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}

export function PaymentBadge({
  mode,
  status,
}: {
  mode: AdminRegistration["payment_mode"];
  status: AdminRegistration["payment_status"];
}) {
  const styles = {
    details_submitted: {
      label: "Not started",
      className: "bg-[var(--paper-deep)] text-[var(--ink-72)]",
    },
    payment_pending: { label: "Pending", className: "bg-[#fff4df] text-[#8b6023]" },
    paid: { label: "Paid", className: "bg-[#e7f4f5] text-[#0b6f75]" },
    cancelled: { label: "Cancelled", className: "bg-[#fff0ed] text-[#9a4637]" },
  };
  const current = styles[status];

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${current.className}`}>
        {current.label}
      </span>
      {mode && (
        <span className="rounded-full bg-[#e4f2f4] px-2.5 py-1 text-xs font-semibold uppercase text-[var(--navy)]">
          {mode}
        </span>
      )}
    </div>
  );
}

function paginationHref(
  filters: AdminListFilters,
  page: { cursor: number | null; direction: "next" | "previous" },
) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.payment !== "all") params.set("payment", filters.payment);
  if (filters.pricing !== "all") params.set("pricing", filters.pricing);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (page.cursor) params.set("cursor", String(page.cursor));
  params.set("direction", page.direction);
  return `/admin?${params.toString()}`;
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
  }).format(new Date(value));
}
