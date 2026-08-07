import Image from "next/image";
import Link from "next/link";

import { adminSignOut } from "@/app/admin/actions";

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-[var(--ink-16)] bg-[var(--paper)]">
      <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 sm:px-8">
        <Link className="flex min-w-0 items-center gap-3" href="/admin">
          <Image
            alt="Investors Summit 2026 — A Jalna First Initiative"
            className="h-auto w-[170px] mix-blend-multiply sm:w-[220px]"
            height={660}
            priority
            src="/investors-summit-2026-logo.png"
            width={2616}
          />
          <span className="hidden rounded-full border border-[var(--ink-16)] bg-[var(--paper)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--navy)] md:inline-flex">
            Admin
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden max-w-56 truncate text-sm text-[var(--ink-72)] sm:block">
            {email}
          </span>
          <form action={adminSignOut}>
            <button className="button-secondary h-10 px-4" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
