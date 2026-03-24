"use client";

import { useDiscreteMode } from "@/contexts/discrete-mode";
import { formatCurrency } from "@/lib/format";

type Props = {
  value: number;
  className?: string;
  /** Prefix shown before the amount (e.g. "+" for positive returns) */
  prefix?: string;
  /** Suffix shown after the amount */
  suffix?: string;
  /** Use compact format (no currency symbol) instead of formatCurrency */
  compact?: boolean;
};

function formatCompact(amount: number): string {
  if (amount === 0) return "";
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat("es-ES", {
    style: "decimal",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function Amount({ value, className, prefix, suffix, compact }: Props) {
  const { discrete } = useDiscreteMode();

  const formatted = compact ? formatCompact(value) : formatCurrency(value);

  return (
    <span className={className} style={discrete ? { filter: "blur(8px)", userSelect: "none" } : undefined}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
