import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { createAdminAuthClient } from "@/lib/supabase/admin-server";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const supabase = await createAdminAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (claimsData?.claims?.sub) {
    const { data: isAdmin } = await supabase.rpc("is_summit_admin");
    if (isAdmin) redirect("/admin");
  }

  return (
    <main className="grid min-h-screen bg-[#f6f4f8] lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#171326] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-28 size-96 rounded-full border border-white/10" />
        <div className="absolute left-16 top-52 size-96 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[#dca761] font-semibold text-[#21172d]">IS</span>
          <div>
            <p className="text-sm font-semibold tracking-wide">INVESTMENT SUMMIT</p>
            <p className="text-xs text-white/55">Administration</p>
          </div>
        </div>
        <div className="relative max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#dca761]">Private workspace</p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-[-0.045em]">Registration operations, in one clear view.</h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-white/65">Monitor registrations, redeem-code usage, payment progress, and attendee details.</p>
        </div>
        <p className="relative text-xs text-white/40">Only approved administrator accounts can continue.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md rounded-[1.75rem] border border-[#e4dfe8] bg-white p-7 shadow-[0_30px_80px_-55px_rgba(39,26,54,0.5)] sm:p-9">
          <span className="inline-flex rounded-full bg-[#eee6f2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6c3d72]">Admin access</span>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Sign in to the dashboard</h2>
          <p className="mt-3 leading-7 text-[#77717f]">Use the administrator account configured in Supabase.</p>
          <AdminLoginForm />
          <Link className="mt-6 block text-center text-sm font-semibold text-[#6c3d72] hover:underline" href="/">← Return to registration</Link>
        </div>
      </section>
    </main>
  );
}
