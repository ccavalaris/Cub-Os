/**
 * Money is integer cents everywhere in this app. These are the only two places
 * it becomes a string, and it never becomes a float.
 */

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}$${(abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Whole-dollar form for stat tiles and price columns: $54, $1,200. */
export function formatCentsShort(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const whole = abs % 100 === 0;
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Parse a user-typed dollar amount ("140", "$140.50") into cents. */
export function parseDollarsToCents(input: string): number {
  const cleaned = String(input).replace(/[^0-9.\-]/g, "");
  if (!cleaned) return 0;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}
