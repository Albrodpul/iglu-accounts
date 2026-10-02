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
