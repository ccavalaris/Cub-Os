import { dayKeyFromDbDate, todayKey } from "@/lib/dates";

/** Whole days from today to an event date; negative once it has passed. */
export function daysOut(date: Date): number {
  const from = Date.parse(`${todayKey()}T00:00:00.000Z`);
  const to = Date.parse(`${dayKeyFromDbDate(date)}T00:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}

export function daysOutLabel(date: Date): string {
  const d = daysOut(date);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} ago`;
  return `${d} days out`;
}

/**
 * An event needs attention when it is inside a week and still has open tasks.
 * Derived, so the badge can never claim something the checklist contradicts.
 */
export function needsAttention(date: Date, openTasks: number): boolean {
  const d = daysOut(date);
  return openTasks > 0 && d >= 0 && d <= 7;
}
