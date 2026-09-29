/**
 * `YYYY-MM-DD` for the given instant in the *local* timezone.
 *
 * `toISOString()` is UTC, so shortly after local midnight in UTC+ zones (Spain)
 * it still reports the previous day — a movement added at 00:30 would default
 * to yesterday. Use this for any "today" shown to or picked by the user.
 */
export function toLocalISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Zero-based month (0–11) of a `YYYY-MM-DD` string, read straight from the
 * text. Avoids `new Date(str)`, which parses as UTC midnight and can shift the
 * month once converted to local time in UTC− zones.
 */
export function monthIndexOf(isoDate: string): number {
  return Number(isoDate.slice(5, 7)) - 1;
}

/** Same local time-of-day `n` calendar days before `from` (DST-safe). */
export function daysAgo(n: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}
