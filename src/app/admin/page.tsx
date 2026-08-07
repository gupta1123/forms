import { redirect } from "next/navigation";

import { adminSignOut } from "@/app/admin/actions";
import {
  AdminDashboard,
  type AdminDashboardData,
} from "@/components/admin-dashboard";
import { createAdminAuthClient } from "@/lib/supabase/admin-server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createAdminAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect("/admin/login");

  const { data, error } = await supabase.rpc("get_summit_admin_dashboard", {
    p_limit: 500,
  });

  if (error || !data) redirect("/admin/login");

  const dashboardData = data as AdminDashboardData;
  const email =
    typeof claimsData.claims.email === "string"
      ? claimsData.claims.email
      : "Administrator";

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--ink-16)] bg-white">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--navy-deep)] text-sm font-semibold text-[var(--steel)]">IS</span>
            <div><p className="text-sm font-semibold tracking-wide">SUMMIT ADMIN</p><p className="text-xs text-[var(--ink-48)]">Registration operations</p></div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden max-w-56 truncate text-sm text-[var(--ink-72)] sm:block">{email}</span>
            <form action={adminSignOut}><button className="button-secondary h-10 px-4" type="submit">Sign out</button></form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        <div className="mb-7">
          <p className="text-sm font-semibold text-[var(--brass)]">Investment Summit</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Registrations</h1>
          <p className="mt-2 text-sm text-[var(--ink-72)]">Attendee details, redeem-code usage, and payment status.</p>
        </div>
        <AdminDashboard data={dashboardData} />
      </div>
    </main>
  );
}
