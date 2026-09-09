/// Date helpers. Everything the dashboard says about time — "today",
/// "5 days out", "overdue" — resolves through here, against local midnight,
/// so a task due today is never reported as overdue because of a clock time.

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function today(): Date {
  return startOfDay(new Date());
}

/** Whole days from today to `d`. Negative is in the past. */
export function daysOut(d: Date, from: Date = today()): number {
  const ms = startOfDay(d).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function daysOutLabel(d: Date, from: Date = today()): string {
  const n = daysOut(d, from);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n < 0) return `${Math.abs(n)} days ago`;
  return `${n} days out`;
}

export function isToday(d: Date, from: Date = today()): boolean {
  return daysOut(d, from) === 0;
}

/** Today through today+6 — the "this week" window the dashboard shows. */
export function isWithinWeek(d: Date, from: Date = today()): boolean {
  const n = daysOut(d, from);
  return n >= 0 && n <= 6;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
