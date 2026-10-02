"use client";

import { useDiscreteMode } from "@/contexts/discrete-mode";
import { formatCurrency, hasCents } from "@/lib/format";
import { useRollingNumber } from "@/hooks/use-rolling-number";

type Props = {
  value: number;
  className?: string;
  /** Prefix shown before the amount (e.g. "+" for positive returns) */
  prefix?: string;
  /** Suffix shown after the amount */
  suffix?: string;
  /** Use compact format (no currency symbol) instead of formatCurrency */
  compact?: boolean;
  /** Roll from the previous value when it changes (headline figures). */
  animate?: boolean;
  /** Round to whole euros: for dense tables where cents are noise. */
  whole?: boolean;
};

function formatCompact(amount: number): string {
  if (amount === 0) return "";
  return new Intl.NumberFormat("es-ES", {
    style: "decimal",
    minimumFractionDigits: hasCents(amount) ? 2 : 0,
    maximumFractionDigits: 2,
    useGrouping: "always", // "1.234" like the rest, not "1234"
  }).format(amount);
}

export function Amount({ value, className, prefix, suffix, compact, animate = false, whole = false }: Props) {
  const { discrete } = useDiscreteMode();
  const rolled = useRollingNumber(value, animate);
  // `|| 0` turns a rounded "-0" into a plain 0.
  const shown = whole ? Math.round(rolled) || 0 : rolled;

  const formatted = compact ? formatCompact(shown) : formatCurrency(shown);

  return (
    <span className={className} style={discrete ? { filter: "blur(8px)", userSelect: "none" } : undefined}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
