"use client";

import { useSyncExternalStore } from "react";
import { daysBetween, formatShortDate } from "@/lib/format";
import { toLocalISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** No new price for this many days is flagged: past a weekend, the source has gone quiet. */
export const STALE_PRICE_DAYS = 4;

const noopSubscribe = () => () => {};

/**
 * "Actualizado hoy" / "Actualizado el 8 oct": the day a new price reached the
 * app (stored as `price_date`). Client-only, since "hoy" depends on the
 * device's day, not the server's.
 */
export function PriceDate({ date, className }: { date: string; className?: string }) {
  const today = useSyncExternalStore(noopSubscribe, () => toLocalISODate(), () => null);
  if (!today) return null;

  const label = formatShortDate(date, today);
  const age = daysBetween(date, today);
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
