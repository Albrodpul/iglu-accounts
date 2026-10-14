"use client";

import { useSyncExternalStore } from "react";
import { daysBetween, formatShortDate } from "@/lib/format";
import { toLocalISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** A price this old (days) is flagged: past a weekend, the source has gone quiet. */
export const STALE_PRICE_DAYS = 4;

const noopSubscribe = () => () => {};

/**
 * "Precio del 8 oct": the date the fund's price belongs to, which for pension
 * plans and some funds lags days behind the last update. Client-only, since
 * "hoy" depends on the device's day, not the server's.
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
      title={stale ? `El último precio publicado es de hace ${age} días` : undefined}
    >
      Precio {label === "hoy" || label === "ayer" ? `de ${label}` : `del ${label}`}
    </span>
  );
}
