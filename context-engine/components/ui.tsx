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
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {title}
          </h2>
          {hint && <span className="text-[12px] text-faint tnum">{hint}</span>}
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
    <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>
  );
}

const STATE_STYLES: Record<DerivedTaskState, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-alert-soft text-alert border-alert-line" },
  open: { label: "Open", className: "bg-line-soft text-muted border-line" },
  in_progress: { label: "In progress", className: "bg-warn-soft text-warn border-warn-line" },
  complete: { label: "Complete", className: "bg-accent-soft text-accent border-accent-line" },
};

export function StatePill({ state }: { state: DerivedTaskState }) {
  const s = STATE_STYLES[state];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}

export function PriorityMark({ priority }: { priority: "LOW" | "MEDIUM" | "HIGH" }) {
  if (priority !== "HIGH") return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-alert-line bg-alert-soft px-2 py-0.5 text-[11px] font-medium text-alert">
      High
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Card className="px-4 py-8 text-center text-[13px] text-faint">{children}</Card>
  );
}

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
  const body = (
    <>
      <div
        className={`tnum text-[28px] font-semibold leading-none ${
          tone === "alert" && value !== 0 ? "text-alert" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-muted">{label}</div>
    </>
  );

  const className =
    "rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors" +
    (href ? " hover:border-faint" : "");

  return href ? (
    <Link href={href} className={`block ${className}`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
