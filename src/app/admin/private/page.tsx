import { AdminHeader } from "@/components/admin-header";
import { AdminNavigation } from "@/components/admin-navigation";
import { AdminPrivateDashboard } from "@/components/admin-private-dashboard";
import { requireSummitAdmin } from "@/lib/admin/access";
import { getPrivateRegistrationPage } from "@/lib/admin/private-data";
import type { PrivateAdminFilters } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

export default async function PrivateAdminPage({ searchParams }: PageProps<"/admin/private">) {
  const filters = parseFilters(await searchParams);
  const { email } = await requireSummitAdmin();
  const data = await getPrivateRegistrationPage(filters);

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <AdminHeader email={email} />
      <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:py-5">
        <AdminNavigation active="private" />
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[14px] font-semibold text-[var(--brass)]">Industrial Summit</p><h1 className="mt-0.5 text-3xl font-semibold tracking-[-0.035em]">Link-only entries</h1></div>
            <p className="max-w-xl text-[15px] leading-6 text-[var(--ink-72)] sm:text-right">Review people who submitted the private form. These entries have no payment or email workflow.</p>
          </div>
          <AdminPrivateDashboard registrations={data.registrations} pagination={data.pagination} filters={filters} />
        </div>
      </div>
    </main>
  );
}

function parseFilters(params: Record<string, string | string[] | undefined>): PrivateAdminFilters {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const cursorValue = first(params.cursor);
  const parsedCursor = cursorValue && /^\d+$/.test(cursorValue) ? Number(cursorValue) : null;
  return {
    search: first(params.q).trim().slice(0, 80),
    sort: first(params.sort) === "oldest" ? "oldest" : "recent",
    cursor: parsedCursor && Number.isSafeInteger(parsedCursor) && parsedCursor > 0 ? parsedCursor : null,
    direction: first(params.direction) === "previous" ? "previous" : "next",
  };
}
