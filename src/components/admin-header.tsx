import Image from "next/image";
import Link from "next/link";

import { adminSignOut } from "@/app/admin/actions";

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ink-16)] bg-[rgb(245_251_251_/_96%)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-4 sm:px-6">
        <Link className="flex min-w-0 items-center gap-2.5" href="/admin">
          <Image
            alt="Industrial Summit"
            className="h-auto w-[150px] sm:w-[180px]"
            height={1660}
            priority
            src="/industrial-summit-logo-v2.png"
            width={4146}
          />
          <span className="hidden rounded-full border border-[var(--ink-16)] bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--navy)] md:inline-flex">
            Admin
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-64 truncate text-[15px] text-[var(--ink-72)] sm:block">
            {email}
          </span>
          <form action={adminSignOut}>
            <button className="button-secondary h-9 min-h-9 px-3.5" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
