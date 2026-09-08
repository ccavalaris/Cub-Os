/**
 * The tee sheet and lesson book are day-scoped. Dates are stored as Postgres
 * DATE columns and handled here as plain YYYY-MM-DD strings so a club in
 * Chicago never sees its 7:00am slot slide to the previous day through a
 * UTC conversion.
 */

export type DayKey = string; // YYYY-MM-DD

export function toDayKey(d: Date): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** A DATE column round-trips as UTC midnight; read it back without shifting. */
export function dayKeyFromDbDate(d: Date): DayKey {
  return d.toISOString().slice(0, 10);
}

/** Build the UTC-midnight Date that Postgres stores for a DATE column. */
export function dayKeyToDbDate(key: DayKey): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

export function shiftDayKey(key: DayKey, days: number): DayKey {
  const d = dayKeyToDbDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidDayKey(key: string | undefined | null): key is DayKey {
  return !!key && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(Date.parse(key));
}

/** "Tuesday, July 7" — the prototype's day-switcher label. */
export function longDayLabel(key: DayKey): string {
  return dayKeyToDbDate(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Minutes from midnight -> "7:00am", the prototype's display form. */
export function minutesToLabel(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")}${h24 >= 12 ? "pm" : "am"}`;
}

export function nowClockLabel(): string {
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  return `${h}:${String(now.getMinutes()).padStart(2, "0")}${now.getHours() >= 12 ? "pm" : "am"}`;
}
