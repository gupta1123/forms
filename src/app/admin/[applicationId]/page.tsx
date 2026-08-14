import { notFound } from "next/navigation";

import { AdminHeader } from "@/components/admin-header";
import { AdminNavigation } from "@/components/admin-navigation";
import { AdminRegistrationDetail } from "@/components/admin-registration-detail";
import { requireSummitAdmin } from "@/lib/admin/access";
import { getAdminRegistrationDetail } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationPage({
  params,
}: PageProps<"/admin/[applicationId]">) {
  const { applicationId } = await params;
  if (!/^\d+$/.test(applicationId)) notFound();

  const numericId = Number(applicationId);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) notFound();

  const { email } = await requireSummitAdmin();
  const detail = await getAdminRegistrationDetail(numericId);
  if (!detail) notFound();

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <AdminHeader email={email} />
      <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:py-5">
        <AdminNavigation active="paid" />
        <div className="min-w-0"><AdminRegistrationDetail detail={detail} /></div>
      </div>
    </main>
  );
}
