"use client";

import { cn } from "@/lib/utils";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  loading?: boolean;
  /** Accessible name when no visible label is tied to the switch. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/** On/off switch used across settings and menus. */
export function ToggleSwitch({ enabled, onToggle, loading = false, ...aria }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={loading}
      onClick={onToggle}
      {...aria}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        enabled ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
          enabled ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
