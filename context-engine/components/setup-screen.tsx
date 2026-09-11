"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadDemoDataAction } from "@/app/setup-actions";
import { DEFAULT_COURSE_NAME } from "@/lib/demo-data";
import type { CourseState } from "@/lib/course";

/// What a deployment shows before it has usable data. Each state says what is
/// wrong and what to do about it — a misconfigured deploy is diagnosable from
/// the browser rather than from a build log.

export function SetupScreen({ state }: { state: Exclude<CourseState, { status: "ok" }> }) {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [courseName, setCourseName] = useState(DEFAULT_COURSE_NAME);
  const [pending, start] = useTransition();

  function load() {
    start(async () => {
      const r = await loadDemoDataAction(courseName);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="mb-6 flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brass text-brass ring-1 ring-inset ring-brass/25"
        >
          <span className="font-mono text-[11px] font-medium tracking-[0.08em]">CC</span>
        </span>
        <p className="label text-faint">Course Context Engine</p>
      </div>

      {state.status === "empty" && (
        <>
          <h1 className="display text-[30px] leading-tight text-accent">Ready to go</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            The database is connected and the schema is in place — there is just no
            data in it yet. Load the demo course and you can start straight away.
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-2.5">
            <div>
              <label
                htmlFor="course-name"
                className="mb-1 block text-[11px] font-medium text-faint"
              >
                Club name
              </label>
              <input
                id="course-name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                disabled={pending || result?.ok}
                placeholder={DEFAULT_COURSE_NAME}
                className="w-64 rounded-[4px] border border-line bg-surface px-2.5 py-2 text-[14px] outline-none focus:border-accent disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={load}
              disabled={pending || result?.ok}
              className="rounded-[4px] bg-accent px-4 py-2 text-[14px] font-medium text-ground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {pending ? "Loading…" : result?.ok ? "Loaded" : "Load demo data"}
            </button>
          </div>

          {result && (
            <p
              className={`mt-3 text-[13px] leading-relaxed ${
                result.ok ? "text-sage" : "text-alert"
              }`}
            >
              {result.message}
            </p>
          )}

          <p className="mt-6 text-[13px] leading-relaxed text-faint">
            10 members, 5 events, 20 tasks and 30 notes — enough to see how the
            dashboard, the inbox and Ask the Course behave. The people and events are
            invented; only the club name is yours to set, so put the name of whoever
            you are showing it to on the door.
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
      <h1 className="display text-[30px] leading-tight text-accent">{title}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
      <ol className="mt-5 list-none space-y-2.5">
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
