import { notFound } from "next/navigation";

import { AdminHeader } from "@/components/admin-header";
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
      <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:py-10">
        <AdminRegistrationDetail detail={detail} />
      </div>
    </main>
  );
}
