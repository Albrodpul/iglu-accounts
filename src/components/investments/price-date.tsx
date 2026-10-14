"use client";

import { useSyncExternalStore } from "react";
import { daysBetween, formatShortDate, navPublishedOn } from "@/lib/format";
import { toLocalISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** No new price for this many days is flagged: past a weekend, the source has gone quiet. */
export const STALE_PRICE_DAYS = 4;

const noopSubscribe = () => () => {};

/**
 * "Actualizado hoy" / "Actualizado el 8 oct": the day the price came out. A
 * fund's NAV values one day and is published the next business day, so
 * Monday's NAV arriving on Tuesday reads "hoy" on Tuesday. Market prices
 * (tickers) come out the day they trade. Client-only, since "hoy" depends on
 * the device's day, not the server's.
 */
export function PriceDate({
  date,
  publishedNextDay = false,
  className,
}: {
  /** `price_date`: the day the price belongs to. */
  date: string;
  /** A fund's NAV (by ISIN), out the business day after the one it values. */
  publishedNextDay?: boolean;
  className?: string;
}) {
  const today = useSyncExternalStore(noopSubscribe, () => toLocalISODate(), () => null);
  if (!today) return null;

  const day = publishedNextDay ? navPublishedOn(date, today) : date;
  const label = formatShortDate(day, today);
  const age = daysBetween(day, today);
  const stale = age >= STALE_PRICE_DAYS;
  return (
    <span
      className={cn(className, stale && "font-medium text-amber-600 dark:text-amber-400")}
      title={stale ? `Sin precio nuevo desde hace ${age} días` : undefined}
    >
      Actualizado {label === "hoy" || label === "ayer" ? label : `el ${label}`}
    </span>
  );
}
