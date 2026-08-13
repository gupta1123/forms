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
    <section className="overflow-hidden rounded-2xl border border-[var(--ink-16)] bg-white shadow-sm">
      <div className="border-b border-[var(--ink-16)] p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
                Registration list
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-72)]">
                {data.pagination.totalMatches} matching registrations ·{" "}
                {filters.sort === "recent" ? "recent first" : "oldest first"}
              </p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 self-start whitespace-nowrap rounded-lg bg-[var(--navy)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--navy-deep)] disabled:cursor-wait disabled:opacity-60 lg:self-auto"
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
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_170px_160px_auto_auto]"
            method="get"
          >
            <label className="relative sm:col-span-2 xl:col-span-1" htmlFor="admin-search">
              <span className="sr-only">Search registrations</span>
              <PiMagnifyingGlass
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-48)]"
              />
              <input
                className="field-input h-10 pl-10"
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
              className="field-input h-10"
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
              className="field-input h-10"
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
              className="field-input h-10"
              defaultValue={filters.sort}
              id="sort-order"
              name="sort"
            >
              <option value="recent">Recent first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--navy)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--navy-deep)]"
              type="submit"
            >
              Apply
            </button>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--ink-16)] px-4 text-sm font-semibold text-[var(--ink-72)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
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
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--ink-16)] bg-[var(--paper)] text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-48)]">
              <th className="px-5 py-3.5">Attendee</th>
              <th className="px-5 py-3.5">Contact</th>
              <th className="px-5 py-3.5">Organisation</th>
              <th className="px-5 py-3.5">City</th>
              <th className="px-5 py-3.5">Pricing</th>
              <th className="px-5 py-3.5">Amount</th>
              <th className="px-5 py-3.5">Payment</th>
              <th className="px-5 py-3.5">Registered</th>
              <th className="px-5 py-3.5 text-right">Details</th>
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

      <div className="flex flex-col gap-3 border-t border-[var(--ink-16)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--ink-48)]">
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
    <tr className="border-b border-[var(--ink-16)] align-top text-sm last:border-0 hover:bg-[var(--paper)]">
      <td className="px-5 py-4">
        <Link className="font-semibold text-[var(--ink)] hover:text-[var(--brass)]" href={detailHref}>
          {registration.first_name} {registration.last_name}
        </Link>
        <p className="mt-1 font-mono text-[11px] text-[var(--ink-48)]">
          IS-{String(registration.application_id).padStart(6, "0")}
        </p>
        <p className="mt-1 text-xs font-semibold capitalize text-[var(--brass)]">
          {registration.registration_type} · {registration.attendee_count} {registration.attendee_count === 1 ? "person" : "people"}
        </p>
      </td>
      <td className="px-5 py-4 text-[var(--ink-72)]">
        <p>{registration.email ?? "No email collected"}</p>
        <p className="mt-1">{registration.phone}</p>
      </td>
      <td className="px-5 py-4">
        <p className="font-medium text-[var(--ink)]">{registration.company_name ?? registration.profession}</p>
        <p className="mt-1 text-[var(--ink-72)]">
          {registration.registration_type === "corporate"
            ? "Corporate registration"
            : `${registration.designation} · ${registration.industry}`}
        </p>
      </td>
      <td className="px-5 py-4 text-[var(--ink-72)]">{registration.place}</td>
      <td className="px-5 py-4">
        {registration.redeem_code ? (
          <span className="rounded-full bg-[var(--paper-deep)] px-2.5 py-1 text-xs font-semibold text-[var(--navy)]">
            {registration.redeem_code}
          </span>
        ) : (
          <span className="text-xs text-[var(--ink-48)]">Standard</span>
        )}
      </td>
      <td className="px-5 py-4">
        <p className="font-semibold text-[var(--ink)]">
          {formatRupees(registration.amount_due_paise)}
        </p>
        {registration.discount_amount_paise > 0 && (
          <p className="mt-1 text-xs text-[var(--seed)]">
            Saved {formatRupees(registration.discount_amount_paise)}
          </p>
        )}
      </td>
      <td className="px-5 py-4">
        <PaymentBadge mode={registration.payment_mode} status={registration.payment_status} />
      </td>
      <td className="px-5 py-4 text-xs leading-5 text-[var(--ink-72)]">
        {formatDate(registration.created_at)}
      </td>
      <td className="px-5 py-4 text-right">
        <Link
          aria-label={`View ${registration.first_name}`}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--ink-16)] text-[var(--navy)] transition hover:border-[var(--navy)] hover:bg-[var(--paper-deep)]"
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
