import Link from "next/link";
import type { ReactNode } from "react";
import type { DerivedTaskState } from "@/lib/derive";

export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="label text-muted">{title}</h2>
          {hint && <span className="tnum font-mono text-[11px] text-faint">{hint}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[5px] border border-line bg-surface shadow-[0_1px_0_rgba(32,31,27,0.03)] ${className}`}
    >
      {children}
    </div>
  );
}

const STATE_STYLES: Record<DerivedTaskState, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "text-alert" },
  open: { label: "Open", className: "text-faint" },
  in_progress: { label: "In progress", className: "text-warn" },
  complete: { label: "Done", className: "text-sage" },
};

/// State reads as a small mono word rather than a coloured pill. A row of
/// pills turns a task list into a field of badges and buries the task titles,
/// which are the thing being scanned.
export function StatePill({ state }: { state: DerivedTaskState }) {
  const s = STATE_STYLES[state];
  return <span className={`label shrink-0 ${s.className}`}>{s.label}</span>;
}

export function PriorityMark({ priority }: { priority: "LOW" | "MEDIUM" | "HIGH" }) {
  if (priority !== "HIGH") return null;
  return (
    <span
      aria-label="High priority"
      title="High priority"
      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-alert"
    />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[5px] border border-dashed border-line px-4 py-9 text-center text-[13px] text-faint">
      {children}
    </div>
  );
}

/// A figure and its label, set like a printed table rather than a tile — the
/// number carries the emphasis, the rule carries the grouping.
export function Stat({
  value,
  label,
  href,
  tone = "plain",
}: {
  value: number | string;
  label: string;
  href?: string;
  tone?: "plain" | "alert";
}) {
  const alarming = tone === "alert" && value !== 0;

  const body = (
    <>
      <div
        className={`display tnum text-[40px] leading-[1.05] ${
          alarming ? "text-alert" : "text-accent"
        }`}
      >
        {value}
      </div>
      <div className="label mt-1.5 text-faint">{label}</div>
    </>
  );

  const className =
    "block border-t border-brass pt-2.5 transition-colors" +
    (alarming ? " border-alert" : "") +
    (href ? " hover:border-accent" : "");

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/// Closes a page the way a clubhouse card closes a page. Ornament, so it is
/// used once at the end rather than between every section, where repetition
/// would make it furniture.
export function Ornament() {
  return (
    <div className="ornament mx-auto mt-12 max-w-xs" aria-hidden>
      <span />
    </div>
  );
}
