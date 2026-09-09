"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadDemoDataAction } from "@/app/setup-actions";
import type { CourseState } from "@/lib/course";

/// What a deployment shows before it has usable data. Each state says what is
/// wrong and what to do about it — a misconfigured deploy is diagnosable from
/// the browser rather than from a build log.

export function SetupScreen({ state }: { state: Exclude<CourseState, { status: "ok" }> }) {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  function load() {
    start(async () => {
      const r = await loadDemoDataAction();
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Course Context Engine
      </p>

      {state.status === "empty" && (
        <>
          <h1 className="mt-2 text-[22px] font-semibold tracking-tight">Ready to go</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            The database is connected and the schema is in place — there is just no
            data in it yet. Load the demo course and you can start straight away.
          </p>

          <button
            type="button"
            onClick={load}
            disabled={pending || result?.ok}
            className="mt-5 rounded-lg bg-accent px-4 py-2 text-[14px] font-medium text-white transition-opacity disabled:opacity-40"
          >
            {pending ? "Loading…" : result?.ok ? "Loaded" : "Load demo data"}
          </button>

          {result && (
            <p
              className={`mt-3 text-[13px] leading-relaxed ${
                result.ok ? "text-accent" : "text-alert"
              }`}
            >
              {result.message}
            </p>
          )}

          <p className="mt-6 text-[13px] leading-relaxed text-faint">
            10 members, 5 events, 20 tasks and 30 notes for a fictional club — enough
            to see how the dashboard, the inbox and Ask the Course behave.
          </p>
        </>
      )}

      {state.status === "no-config" && (
        <Problem
          title="No database configured"
          body="This deployment has no DATABASE_URL set, so there is nothing for it to read or write."
          steps={[
            "Add DATABASE_URL to the project's environment variables.",
            "On Supabase, use the Session pooler connection string — click Connect and choose Session pooler. The direct db.<ref>.supabase.co address is IPv6-only and most hosting cannot reach it.",
            "Redeploy.",
          ]}
        />
      )}

      {state.status === "no-schema" && (
        <Problem
          title="Database connected, tables missing"
          body="The connection works, but this database has not had the schema applied to it."
          steps={[
            "Redeploy — the build applies migrations before it builds.",
            "If it still says this, the build log will show why the migration step was skipped.",
          ]}
        />
      )}

      {state.status === "unreachable" && (
        <Problem
          title="Database problem"
          body={state.detail}
          steps={["Fix DATABASE_URL in the project's environment variables, then redeploy."]}
        />
      )}
    </div>
  );
}

function Problem({
  title,
  body,
  steps,
}: {
  title: string;
  body: string;
  steps: string[];
}) {
  return (
    <>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
      <ol className="mt-5 space-y-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
            <span className="tnum shrink-0 text-faint">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
