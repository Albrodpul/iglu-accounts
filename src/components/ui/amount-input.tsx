import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/** Direction of the money, shown as a coloured sign so it's clear before saving. */
export type AmountTone = "expense" | "income" | "debt" | "neutral"

const toneStyles: Record<AmountTone, { sign: string | null; text: string; border: string }> = {
  expense: { sign: "−", text: "text-expense", border: "border-expense/40 focus-visible:border-expense" },
  income: { sign: "+", text: "text-income", border: "border-income/40 focus-visible:border-income" },
  debt: { sign: "+", text: "text-debt", border: "border-debt/40 focus-visible:border-debt" },
  neutral: { sign: null, text: "", border: "" },
}

/**
 * Monetary input: oversized, bold and right-affixed with the currency symbol so
 * the amount reads as the primary field of a form. `tone` colours it and adds
 * a leading sign; the typed value itself stays unsigned.
 */
/** "99" → "99.00", "12.5" → "12.50"; never rounds values with more decimals. */
function padDecimals(value: string): string {
  const n = Number(value)
  if (value.trim() === "" || !Number.isFinite(n)) return value
  const decimals = value.split(".")[1]?.length ?? 0
  return decimals <= 2 ? n.toFixed(2) : value
}

function AmountInput({
  className,
  currency = "€",
  tone = "neutral",
  defaultValue,
  onBlur,
  ...props
}: React.ComponentProps<"input"> & { currency?: string; tone?: AmountTone }) {
  const style = toneStyles[tone]
  return (
    <div className="relative">
      {style.sign && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-3 flex items-center text-2xl font-bold md:text-xl",
            style.text
          )}
        >
          {style.sign}
        </span>
      )}
      <Input
        type="number"
        inputMode="decimal"
        placeholder="0,00"
        {...props}
        // Amounts always read with two decimals, like everywhere else in the app.
        defaultValue={typeof defaultValue === "number" ? padDecimals(String(defaultValue)) : defaultValue}
        onBlur={(e) => {
          e.currentTarget.value = padDecimals(e.currentTarget.value)
          onBlur?.(e)
        }}
        className={cn(
          "h-14 pl-3 pr-10 text-2xl font-bold tabular-nums transition-colors md:h-12 md:text-xl",
          style.sign && "pl-8",
          style.text,
          style.border,
          className
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-lg font-medium text-muted-foreground"
      >
        {currency}
      </span>
    </div>
  )
}

export { AmountInput, padDecimals }
