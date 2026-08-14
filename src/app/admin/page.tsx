import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminHeader } from "@/components/admin-header";
import { AdminNavigation } from "@/components/admin-navigation";
import { requireSummitAdmin } from "@/lib/admin/access";
import { getAdminRegistrationPage } from "@/lib/admin/data";
import type {
  AdminDashboardData,
  AdminListFilters,
  AdminMetrics,
} from "@/lib/admin/types";

export const dynamic = "force-dynamic";

type DashboardSummary = {
  generated_at: string;
  source: string;
  metrics: AdminMetrics;
};

export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin">) {
  const filters = parseFilters(await searchParams);
  const { email, supabase } = await requireSummitAdmin();
  const [summaryResult, pageData] = await Promise.all([
    supabase.rpc("get_summit_admin_dashboard", { p_limit: 1 }),
    getAdminRegistrationPage(filters),
  ]);

  if (summaryResult.error || !summaryResult.data) {
    throw new Error("The admin dashboard summary could not be loaded.");
  }

  const summary = summaryResult.data as DashboardSummary;
  const dashboardData: AdminDashboardData = {
    ...summary,
    registrations: pageData.registrations,
    pagination: pageData.pagination,
  };

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <AdminHeader email={email} />
      <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:py-5">
        <AdminNavigation active="paid" />
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[14px] font-semibold text-[var(--brass)]">
              Industrial Summit
            </p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-[-0.035em]">
              Registrations
            </h1>
          </div>
          <p className="max-w-xl text-[15px] leading-6 text-[var(--ink-72)] sm:text-right">
            Browse the attendee list, then open a registration for its complete
            payment history.
          </p>
          </div>
          <AdminDashboard data={dashboardData} filters={filters} />
        </div>
      </div>
    </main>
  );
}

function parseFilters(
  params: Record<string, string | string[] | undefined>,
): AdminListFilters {
  const paymentValue = firstValue(params.payment);
  const pricingValue = firstValue(params.pricing);
  const sortValue = firstValue(params.sort);
  const directionValue = firstValue(params.direction);
  const cursorValue = firstValue(params.cursor);
  const parsedCursor = cursorValue && /^\d+$/.test(cursorValue)
    ? Number(cursorValue)
    : null;

  return {
    search: firstValue(params.q).trim().slice(0, 80),
    payment: ["awaiting", "paid", "cancelled"].includes(paymentValue)
      ? (paymentValue as AdminListFilters["payment"])
      : "all",
    pricing: ["redeemed", "standard"].includes(pricingValue)
      ? (pricingValue as AdminListFilters["pricing"])
      : "all",
    sort: sortValue === "oldest" ? "oldest" : "recent",
    cursor:
      parsedCursor && Number.isSafeInteger(parsedCursor) && parsedCursor > 0
        ? parsedCursor
        : null,
    direction: directionValue === "previous" ? "previous" : "next",
  };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
