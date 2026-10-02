"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { evaluateAmount, isSum, toAmountText } from "@/lib/amount-expression"
import { Input } from "@/components/ui/input"

/** Direction of the money, shown as a coloured sign so it's clear before saving. */
export type AmountTone = "expense" | "income" | "debt" | "neutral"

const toneStyles: Record<AmountTone, { sign: string | null; text: string; border: string }> = {
  expense: { sign: "−", text: "text-expense", border: "border-expense/40 focus-visible:border-expense" },
  income: { sign: "+", text: "text-income", border: "border-income/40 focus-visible:border-income" },
  debt: { sign: "+", text: "text-debt", border: "border-debt/40 focus-visible:border-debt" },
  neutral: { sign: null, text: "", border: "" },
}

type Props = Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange"> & {
  defaultValue?: number | string
  currency?: string
  tone?: AmountTone
  /** Called with the amount (or `null` while it isn't a valid one) on every edit. */
  onValueChange?: (value: number | null) => void
}

function roundToStep(value: number, step: Props["step"]): number {
  const decimals = String(step ?? "any").split(".")[1]?.length
  if (step === undefined || step === "any" || Number.isNaN(Number(step))) return value
  const factor = 10 ** (decimals ?? 0)
  return Math.round(value * factor) / factor
}

/**
 * Monetary input: oversized, bold and right-affixed with the currency symbol so
 * the amount reads as the primary field of a form. `tone` colours it and adds
 * a leading sign; the typed value itself stays unsigned.
 *
 * Accepts a plain amount or a quick sum ("12,50+8"). The form receives the
 * result, as a plain number, through a hidden input carrying `name`.
 */
function AmountInput({
  className,
  currency = "€",
  tone = "neutral",
  name,
  defaultValue,
  min,
  step,
  ref,
  onBlur,
  onValueChange,
  ...props
}: Props) {
  const style = toneStyles[tone]
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [text, setText] = React.useState(() =>
    typeof defaultValue === "number" ? toAmountText(defaultValue) : (defaultValue ?? "")
  )

  const valueOf = (input: string) => {
    const evaluated = evaluateAmount(input)
    return evaluated === null ? null : roundToStep(evaluated, step)
  }
  const value = valueOf(text)

  function update(next: string) {
    setText(next)
    onValueChange?.(valueOf(next))
  }
  const minValue = min === undefined || min === "" ? null : Number(min)
  const error =
    text.trim() === ""
      ? "" // `required` covers the empty case
      : value === null
        ? "Introduce un importe válido, por ejemplo 12,50 o 12,50+8"
        : minValue !== null && value < minValue
          ? minValue > 0 && minValue < 0.01
            ? "El importe debe ser mayor que 0"
            : `El importe mínimo es ${toAmountText(minValue)}`
          : ""

  // The browser blocks submit and shows this message, like a native number field.
  React.useEffect(() => {
    inputRef.current?.setCustomValidity(error)
  }, [error])

  function setRefs(node: HTMLInputElement | null) {
    inputRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  function appendPlus() {
    if (text && !/[+-]$/.test(text.trim())) update(`${text}+`)
    inputRef.current?.focus()
  }

  const showResult = value !== null && isSum(text)

  return (
    <div>
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
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          {...props}
          ref={setRefs}
          value={text}
          onChange={(e) => update(e.target.value)}
          onBlur={(e) => {
            // Leaving the field settles a sum into its result.
            if (showResult) setText(toAmountText(value))
            onBlur?.(e)
          }}
          className={cn(
            "h-14 pl-3 pr-10 text-2xl font-bold tabular-nums transition-colors md:h-12 md:text-xl",
            "[@media(pointer:coarse)]:pr-20",
            style.sign && "pl-8",
            style.text,
            style.border,
            className
          )}
        />
        {name && <input type="hidden" name={name} value={value ?? ""} />}
        {/* Phone numeric keypads have no "+", so offer one. */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Sumar otra cantidad"
          // Keep focus (and the keyboard) on the field.
          onPointerDown={(e) => e.preventDefault()}
          onClick={appendPlus}
          className="absolute inset-y-0 right-9 my-auto hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted [@media(pointer:coarse)]:flex"
        >
          <Plus className="h-4 w-4" />
        </button>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-lg font-medium text-muted-foreground"
        >
          {currency}
        </span>
      </div>
      {showResult && (
        <p className="mt-1 text-right text-xs font-medium text-muted-foreground tabular-nums" aria-live="polite">
          = {toAmountText(value)} {currency}
        </p>
      )}
    </div>
  )
}

export { AmountInput }
