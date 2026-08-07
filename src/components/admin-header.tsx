import Link from "next/link";

import { adminSignOut } from "@/app/admin/actions";

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-[var(--ink-16)] bg-white">
      <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 sm:px-8">
        <Link className="flex items-center gap-3" href="/admin">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--navy-deep)] text-sm font-semibold text-[var(--steel)]">
            IS
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-wide">
              SUMMIT ADMIN
            </span>
            <span className="block text-xs text-[var(--ink-48)]">
              Registration operations
            </span>
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
