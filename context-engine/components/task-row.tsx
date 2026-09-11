"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTaskStatus } from "@/app/actions";
import { StatePill, PriorityMark } from "@/components/ui";
import type { DerivedTaskState } from "@/lib/derive";

export type TaskRowData = {
  id: string;
  title: string;
  owner: string | null;
  dueLabel: string | null;
  state: DerivedTaskState;
  priority: "LOW" | "MEDIUM" | "HIGH";
  eventName: string | null;
  eventId: string | null;
  memberName: string | null;
  memberId: string | null;
};

export function TaskRow({ task, showPills = true }: { task: TaskRowData; showPills?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const done = task.state === "complete";

  function toggle() {
    start(async () => {
      await setTaskStatus(task.id, done ? "OPEN" : "COMPLETE");
      router.refresh();
    });
  }

  return (
    <li
      className={`flex items-start gap-2.5 px-3.5 py-2.5 transition-opacity ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
          done ? "border-accent bg-accent text-ground" : "border-faint hover:border-accent"
        }`}
      >
        {done && (
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden>
            <path
              d="M1 5l2.5 2.5L9 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[14px] leading-snug ${
            done ? "text-faint line-through" : "text-ink"
          }`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
          {task.owner && <span>{task.owner}</span>}
          {task.dueLabel && (
            <>
              {task.owner && <span aria-hidden className="text-faint">·</span>}
              <span className={task.state === "overdue" ? "text-alert" : undefined}>
                {task.dueLabel}
              </span>
            </>
          )}
          {task.eventName && task.eventId && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <Link href={`/events/${task.eventId}`} className="hover:text-ink hover:underline">
                {task.eventName}
              </Link>
            </>
          )}
          {task.memberName && task.memberId && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <Link href={`/members/${task.memberId}`} className="hover:text-ink hover:underline">
                {task.memberName}
              </Link>
            </>
          )}
        </p>
      </div>

      {showPills && (
        <div className="flex shrink-0 items-center gap-1.5">
          {!done && <PriorityMark priority={task.priority} />}
          <StatePill state={task.state} />
        </div>
      )}
    </li>
  );
}
