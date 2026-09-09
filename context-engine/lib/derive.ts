import type { Task, Event, Member, Interaction } from "@prisma/client";
import { daysOut, isToday, isWithinWeek, today } from "./dates";

/// Derived task state. The database stores OPEN / IN_PROGRESS / COMPLETE;
/// "overdue" is computed from the due date every time it is read, so the
/// badge on screen can never disagree with the date beside it.

export type DerivedTaskState = "open" | "in_progress" | "complete" | "overdue";

export function taskState(task: Pick<Task, "status" | "dueDate">): DerivedTaskState {
  if (task.status === "COMPLETE") return "complete";
  if (task.dueDate && daysOut(task.dueDate) < 0) return "overdue";
  return task.status === "IN_PROGRESS" ? "in_progress" : "open";
}

export function isOverdue(task: Pick<Task, "status" | "dueDate">): boolean {
  return taskState(task) === "overdue";
}

export function isOpen(task: Pick<Task, "status">): boolean {
  return task.status !== "COMPLETE";
}

export function isDueToday(task: Pick<Task, "status" | "dueDate">): boolean {
  return isOpen(task) && task.dueDate != null && isToday(task.dueDate);
}

export function isDueThisWeek(task: Pick<Task, "status" | "dueDate">): boolean {
  return isOpen(task) && task.dueDate != null && isWithinWeek(task.dueDate);
}

/// Attention items.
///
/// These are COMPUTED from the records, not written by a model. Every one of
/// them is a fact with a row behind it: a count of overdue tasks, an event
/// inside its window with open work, a member note with no follow-up logged.
/// That means the list is always true, always instant, costs nothing, and
/// cannot invent a member who never called. The model's judgment is spent
/// where it actually earns its keep — reading a messy note in the inbox, and
/// answering questions in Ask the Course.

export type AttentionItem = {
  id: string;
  severity: "high" | "medium";
  headline: string;
  detail: string;
  href: string;
};

type AttentionInput = {
  tasks: (Task & { event: Event | null; member: Member | null })[];
  events: (Event & { tasks: Task[] })[];
  interactions: (Interaction & { member: Member | null })[];
};

export function attentionItems({ tasks, events, interactions }: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  const now = today();

  // 1. Overdue work, as one line rather than one line per task.
  const overdue = tasks.filter((t) => isOverdue(t));
  if (overdue.length > 0) {
    const oldest = overdue.reduce((a, b) =>
      (a.dueDate?.getTime() ?? 0) < (b.dueDate?.getTime() ?? 0) ? a : b,
    );
    const behind = oldest.dueDate ? Math.abs(daysOut(oldest.dueDate, now)) : 0;
    items.push({
      id: "overdue-tasks",
      severity: "high",
      headline:
        overdue.length === 1
          ? "1 task is overdue"
          : `${overdue.length} tasks are overdue`,
      detail:
        overdue.length === 1
          ? `“${oldest.title}” was due ${behind} day${behind === 1 ? "" : "s"} ago.`
          : `Oldest is “${oldest.title}”, due ${behind} day${behind === 1 ? "" : "s"} ago.`,
      href: "/tasks?filter=overdue",
    });
  }

  // 2. Events close enough to matter that still have open work on them.
  for (const event of events) {
    const out = daysOut(event.date, now);
    if (out < 0 || out > 14) continue;
    const open = event.tasks.filter(isOpen);
    if (open.length === 0) continue;
    items.push({
      id: `event-${event.id}`,
      severity: out <= 7 ? "high" : "medium",
      headline:
        out === 0
          ? `${event.name} is today`
          : `${event.name} is ${out} day${out === 1 ? "" : "s"} away`,
      detail: `${open.length} open item${open.length === 1 ? "" : "s"}: ${open
        .slice(0, 3)
        .map((t) => t.title)
        .join(", ")}${open.length > 3 ? "…" : ""}`,
      href: `/events/${event.id}`,
    });
  }

  // 3. Member notes from the last two weeks with nothing open against them —
  //    someone asked for something and no follow-up was ever recorded.
  const openByMember = new Set(
    tasks.filter(isOpen).map((t) => t.memberId).filter(Boolean) as string[],
  );
  const unanswered = interactions.filter((i) => {
    if (!i.member || !i.needsResponse) return false;
    const age = daysOut(i.date, now);
    return age <= 0 && age >= -14 && !openByMember.has(i.member.id);
  });
  for (const i of unanswered.slice(0, 4)) {
    items.push({
      id: `interaction-${i.id}`,
      severity: "medium",
      headline: `${i.member!.name} is waiting on a reply`,
      detail: i.content.length > 130 ? `${i.content.slice(0, 130)}…` : i.content,
      href: `/members/${i.member!.id}`,
    });
  }

  const rank = { high: 0, medium: 1 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
