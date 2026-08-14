import Link from "next/link";
import { PiCreditCard, PiLinkSimple } from "react-icons/pi";

export function AdminNavigation({ active }: { active: "paid" | "private" }) {
  const items = [
    { key: "paid" as const, href: "/admin", label: "Paid registrations", description: "Public form and payments", icon: PiCreditCard },
    { key: "private" as const, href: "/admin/private", label: "Link-only entries", description: "Private form submissions", icon: PiLinkSimple },
  ];

  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <nav aria-label="Admin sections" className="grid gap-2 rounded-xl border border-[var(--ink-16)] bg-white p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-1">
        {items.map(({ key, href, label, description, icon: Icon }) => {
          const isActive = active === key;
          return (
            <Link className={`flex items-start gap-3 rounded-lg px-3 py-3 transition ${isActive ? "bg-[var(--navy)] text-white" : "text-[var(--ink-72)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"}`} href={href} key={key} aria-current={isActive ? "page" : undefined}>
              <Icon className={`mt-0.5 shrink-0 text-lg ${isActive ? "text-[var(--steel)]" : "text-[var(--brass)]"}`} aria-hidden="true" />
              <span>
                <strong className="block text-[15px] font-semibold leading-5">{label}</strong>
                <small className={`mt-0.5 block text-[12px] leading-4 ${isActive ? "text-white/65" : "text-[var(--ink-48)]"}`}>{description}</small>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
