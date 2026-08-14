import Link from "next/link";
import { notFound } from "next/navigation";
import { PiArrowLeft } from "react-icons/pi";

import { AdminHeader } from "@/components/admin-header";
import { AdminNavigation } from "@/components/admin-navigation";
import { requireSummitAdmin } from "@/lib/admin/access";
import { getPrivateRegistrationDetail } from "@/lib/admin/private-data";

export const dynamic = "force-dynamic";

export default async function PrivateRegistrationDetailPage({ params }: PageProps<"/admin/private/[registrationId]">) {
  const { registrationId } = await params;
  if (!/^\d+$/.test(registrationId)) notFound();
  const id = Number(registrationId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const { email } = await requireSummitAdmin();
  const registration = await getPrivateRegistrationDetail(id);
  if (!registration) notFound();

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <AdminHeader email={email} />
      <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:py-5">
        <AdminNavigation active="private" />
        <div className="min-w-0">
          <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--navy)] hover:text-[var(--brass)]" href="/admin/private"><PiArrowLeft aria-hidden="true" /> Back to link-only entries</Link>
          <section className="overflow-hidden rounded-xl border border-[var(--ink-16)] bg-white shadow-sm">
            <div className="border-b border-[var(--ink-16)] bg-[var(--navy-deep)] px-5 py-5 text-white sm:px-7">
              <p className="font-mono text-xs tracking-[0.12em] text-[var(--steel)]">PR-{String(registration.id).padStart(6, "0")}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{registration.first_name} {registration.last_name}</h1>
              <p className="mt-1 text-sm text-white/65">Submitted {formatDate(registration.created_at)}</p>
            </div>
            <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-2">
              <DetailCard title="Attendee details"><Row label="Email" value={registration.email} /><Row label="Phone" value={registration.phone} /><Row label="City" value={registration.place} /></DetailCard>
              <DetailCard title="Professional profile"><Row label="Organisation" value={registration.profession} /><Row label="Designation" value={registration.designation} /><Row label="Sector" value={registration.industry} /></DetailCard>
              <DetailCard title="Summit participation"><Row label="Purpose" value={registration.participation_purpose} /><Row label="Notes" value={registration.summit_expectations || "Not provided"} /></DetailCard>
              <DetailCard title="Submission record"><Row label="Source" value="Private link" /><Row label="Created" value={formatDate(registration.created_at)} /><Row label="Updated" value={formatDate(registration.updated_at)} /></DetailCard>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="rounded-xl border border-[var(--ink-16)] bg-[var(--paper)] p-5"><h2 className="mb-3 font-semibold text-[var(--navy)]">{title}</h2><dl className="divide-y divide-[var(--ink-16)] text-sm">{children}</dl></article>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 py-2.5 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4"><dt className="text-[var(--ink-48)]">{label}</dt><dd className="break-words sm:text-right">{value}</dd></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
