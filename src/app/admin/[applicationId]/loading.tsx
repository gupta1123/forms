export default function AdminRegistrationLoading() {
  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-[1320px] animate-pulse">
        <div className="h-5 w-44 rounded bg-[var(--paper-deep)]" />
        <div className="mt-6 h-44 rounded-2xl bg-[var(--paper-deep)]" />
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="h-56 rounded-2xl bg-[var(--paper-deep)]" />
          <div className="h-56 rounded-2xl bg-[var(--paper-deep)]" />
          <div className="h-56 rounded-2xl bg-[var(--paper-deep)]" />
        </div>
      </div>
    </main>
  );
}
