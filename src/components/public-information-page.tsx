import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SummitHeader } from "@/components/summit-chrome";

export function PublicInformationPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="summit-app flex min-h-screen flex-col">
      <SummitHeader activeStep={1} />

      <div className="mx-auto w-[min(900px,92vw)] flex-1 py-12 sm:py-16">
        <p className="summit-kicker">
          {eyebrow}
        </p>
        <h1 className="mt-4 font-serif text-4xl font-normal tracking-[-0.025em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--ink-72)]">{intro}</p>

        <article className="mt-10 space-y-8 border-[1.5px] border-[var(--ink)] bg-[var(--card)] p-6 leading-7 shadow-[8px_9px_0_var(--navy)] sm:p-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-normal [&_h2]:tracking-[-0.02em] [&_li]:text-[var(--ink-72)] [&_p]:text-[var(--ink-72)] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </article>
        <Link className="summit-quiet-link mt-10" href="/">
          Return to registration
        </Link>
      </div>

      <SiteFooter />
    </main>
  );
}
