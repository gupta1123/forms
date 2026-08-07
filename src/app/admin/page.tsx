import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminHeader } from "@/components/admin-header";
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
      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        <div className="mb-7">
          <p className="text-sm font-semibold text-[var(--brass)]">
            Investment Summit
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Registrations
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-72)]">
            Browse the attendee list, then open a registration for its complete
            payment history.
          </p>
        </div>
        <AdminDashboard data={dashboardData} filters={filters} />
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
