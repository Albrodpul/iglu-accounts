"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Semantic colour of the selected option's label. */
export type SegmentTone = "primary" | "expense" | "income" | "debt" | "transfer";

const toneText: Record<SegmentTone, string> = {
  primary: "text-primary",
  expense: "text-expense",
  income: "text-income",
  debt: "text-debt",
  transfer: "text-transfer",
};

export type SegmentOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: SegmentTone;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  "aria-label": string;
  className?: string;
};

/**
 * iOS-style segmented control: a muted track where the chosen option is a
 * raised white pill tinted with its semantic colour. Replaces rows of
 * saturated full-colour buttons.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  ...rest
}: Props<T>) {
  return (
    <div
      role="group"
      aria-label={rest["aria-label"]}
      className={cn("grid gap-1 rounded-xl bg-muted/80 p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(({ value: optionValue, label, icon: Icon, tone = "primary" }) => {
        const active = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(optionValue)}
            className={cn(
              "flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold leading-tight transition-all duration-200 active:scale-[0.97] md:min-h-9",
              active
                ? cn(
                    // In dark mode "card" is darker than the track, so lift with white instead.
                    "bg-card shadow-sm ring-1 ring-border/60 dark:bg-white/10 dark:ring-white/10",
                    toneText[tone]
                  )
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span className="min-w-0">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
