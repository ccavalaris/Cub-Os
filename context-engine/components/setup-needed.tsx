export function SetupNeeded() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-[22px] font-semibold tracking-tight">Nothing here yet</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        The database is set up but has no course in it. Load the demo data from a
        machine that can reach the database:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface px-3.5 py-3 text-[12px] leading-relaxed">
        <code>{`DATABASE_URL="<your connection string>" npm run seed`}</code>
      </pre>
      <p className="mt-4 text-[13px] leading-relaxed text-faint">
        Then reload this page.
      </p>
    </div>
  );
}
