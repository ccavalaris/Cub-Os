import type { Task, Event, Member } from "@prisma/client";
import type { TaskRowData } from "@/components/task-row";
import { taskState } from "./derive";
import { daysOut, daysOutLabel } from "./dates";

/// One place that turns a Task row into what the UI shows, so the due-date
/// wording is identical on the dashboard, the task list, an event and a member.

export function toTaskRow(
  task: Task & { event?: Event | null; member?: Member | null },
): TaskRowData {
  const state = taskState(task);
  let dueLabel: string | null = null;
  if (task.dueDate) {
    const out = daysOut(task.dueDate);
    dueLabel =
      state === "overdue"
        ? `Due ${daysOutLabel(task.dueDate)}`
        : out === 0
          ? "Due today"
          : `Due ${daysOutLabel(task.dueDate)}`;
  }

  return {
    id: task.id,
    title: task.title,
    owner: task.owner,
    dueLabel,
    state,
    priority: task.priority,
    eventName: task.event?.name ?? null,
    eventId: task.event?.id ?? null,
    memberName: task.member?.name ?? null,
    memberId: task.member?.id ?? null,
  };
}
