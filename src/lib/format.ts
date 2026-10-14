/**
 * Whole amounts without decimals ("-99 €"), the rest with two ("12,50 €").
 * Always a thousands separator: Spanish formatting skips it for 4-digit numbers
 * by default ("1579,94 €" next to "14.515,43 €"); `useGrouping: "always"` avoids that.
 */
const wholeFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  useGrouping: "always",
});
const centsFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

/** True when the amount has cents once rounded (ignores float noise like 99.0000001). */
export function hasCents(amount: number): boolean {
  return Math.round(amount * 100) % 100 !== 0;
}

export function formatCurrency(amount: number): string {
  return (hasCents(amount) ? centsFormatter : wholeFormatter).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export function formatDateWithYear(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

const timeFormatter = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });
const dayMonthFormatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

/**
 * When something last happened, relative to `now` and in the viewer's time
 * zone: "hoy a las 18:02", "ayer a las 23:00", "el 28 sept a las 10:00"
 * (with the year once it isn't the current one).
 */
export function formatWhen(date: Date, now: Date = new Date()): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const time = timeFormatter.format(date);
  if (days === 0) return `hoy a las ${time}`;
  if (days === 1) return `ayer a las ${time}`;
  const day = dayMonthFormatter.format(date);
  const year = date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`;
  return `el ${day}${year} a las ${time}`;
}

const decimalFormatters = new Map<number, Intl.NumberFormat>();

/** Plain number the Spanish way, with up to `maxDecimals` decimals: "67,15", "14,2049", "1.234,5". */
export function formatDecimal(value: number, maxDecimals = 4): string {
  let formatter = decimalFormatters.get(maxDecimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: maxDecimals, useGrouping: "always" });
    decimalFormatters.set(maxDecimals, formatter);
  }
  return formatter.format(value);
}

const percentFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Percentages the Spanish way, like the amounts: "6,8 %", "+6,8 %", "-3,03 %".
 * `value` is already a percentage (6.8, not 0.068). With `signed`, gains get a
 * "+" and an exact zero gets no sign.
 */
export function formatPercent(value: number, opts: { decimals?: number; signed?: boolean } = {}): string {
  const { decimals = 1, signed = false } = opts;
  const key = `${decimals}:${signed}`;
  let formatter = percentFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("es-ES", {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay: signed ? "exceptZero" : "auto",
    });
    percentFormatters.set(key, formatter);
  }
  return formatter.format(value / 100);
}

/** Day header of the movement lists: "lun, 28 sept" (optionally with the year). */
/**
 * A price's date, short: "hoy", "ayer", "8 oct" or, from another year, "8 oct 2025".
 * Both arguments are YYYY-MM-DD.
 */
export function formatShortDate(date: string, today: string): string {
  if (date === today) return "hoy";
  if (date === shiftISODate(today, -1)) return "ayer";
  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");
  return date.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${y}`;
}

/** Whole days between two YYYY-MM-DD dates (later minus earlier). */
export function daysBetween(from: string, to: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/**
 * Day a fund's NAV is published: the next business day after the one it
 * values (Friday's comes out on Monday), never later than `today`.
 */
export function navPublishedOn(valuationDate: string, today: string): string {
  const [y, m, d] = valuationDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday … 6 = Saturday
  const published = shiftISODate(valuationDate, weekday === 5 ? 3 : weekday === 6 ? 2 : 1);
  return published < today ? published : today;
}

function shiftISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatDayHeader(date: string, withYear = false): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear && { year: "numeric" }),
  }).format(new Date(date));
}

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
