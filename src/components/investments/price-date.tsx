"use client";

import { useSyncExternalStore } from "react";
import { daysBetween, formatShortDate, formatWhen, navPublishedOn } from "@/lib/format";
import { toLocalISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** No new price for this many days is flagged: past a weekend, the source has gone quiet. */
export const STALE_PRICE_DAYS = 4;

const noopSubscribe = () => () => {};

/**
 * "Actualizado hoy a las 11:00": when the price came out (see
 * `price_updated_at`). Prices stored before that existed fall back to the
 * day only: a fund's NAV values one day and is published the next business
 * day; market prices come out the day they trade. Client-only, since "hoy"
 * and the hour depend on the device's clock, not the server's.
 */
export function PriceDate({
  date,
  updatedAt,
  publishedNextDay = false,
  className,
}: {
  /** `price_date`: the day the price belongs to. */
  date: string;
  /** `price_updated_at`: when it came out, if known. */
  updatedAt?: string | null;
  /** A fund's NAV (by ISIN), out the business day after the one it values. */
  publishedNextDay?: boolean;
  className?: string;
}) {
  const today = useSyncExternalStore(noopSubscribe, () => toLocalISODate(), () => null);
  if (!today) return null;

  const at = updatedAt ? new Date(updatedAt) : null;
  const day = at ? toLocalISODate(at) : publishedNextDay ? navPublishedOn(date, today) : date;
  const age = daysBetween(day, today);
  const stale = age >= STALE_PRICE_DAYS;
  const label = formatShortDate(day, today);
  return (
    <span
      className={cn(className, stale && "font-medium text-amber-600 dark:text-amber-400")}
      title={stale ? `Sin precio nuevo desde hace ${age} días` : undefined}
    >
      Actualizado {at ? formatWhen(at) : label === "hoy" || label === "ayer" ? label : `el ${label}`}
    </span>
  );
}
