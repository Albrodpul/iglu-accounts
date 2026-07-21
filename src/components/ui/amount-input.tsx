import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/**
 * Monetary input: oversized, bold and right-affixed with the currency symbol so
 * the amount reads as the primary field of a form.
 */
function AmountInput({
  className,
  currency = "€",
  ...props
}: React.ComponentProps<"input"> & { currency?: string }) {
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="decimal"
        placeholder="0,00"
        {...props}
        className={cn(
          "h-14 pl-3 pr-10 text-2xl font-bold tabular-nums md:h-12 md:text-xl",
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

export { AmountInput }
