"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"

type Props = Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange"> & {
  defaultValue?: number | null
  /** Called with the number (or `null` when empty or not valid) on every edit. */
  onValueChange?: (value: number | null) => void
}

const DECIMAL = /^\d+(?:[.,]\d*)?$|^[.,]\d+$/

function parse(text: string): number | null {
  const trimmed = text.trim()
  if (!DECIMAL.test(trimmed)) return null
  return Number(trimmed.replace(",", "."))
}

/**
 * Number field that is written the Spanish way ("12,72", a dot works too) with
 * the phone's decimal keypad. A native `type="number"` shows and expects a dot
 * on many devices. The form receives a plain number through a hidden input
 * carrying `name`.
 */
function DecimalInput({ name, defaultValue, onValueChange, min, ...props }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [text, setText] = React.useState(() => (defaultValue == null ? "" : String(defaultValue).replace(".", ",")))

  const value = parse(text)
  const minValue = min === undefined || min === "" ? null : Number(min)
  const error =
    text.trim() === ""
      ? ""
      : value === null
        ? "Introduce un número, por ejemplo 12,72"
        : minValue !== null && value < minValue
          ? "Debe ser mayor que 0"
          : ""

  React.useEffect(() => {
    inputRef.current?.setCustomValidity(error)
  }, [error])

  return (
    <>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        {...props}
        ref={inputRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onValueChange?.(parse(e.target.value))
        }}
      />
      {name && <input type="hidden" name={name} value={value ?? ""} />}
    </>
  )
}

export { DecimalInput }
