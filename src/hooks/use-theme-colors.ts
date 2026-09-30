"use client";

import { useMemo, useSyncExternalStore } from "react";

/** Theme tokens charts need, resolved to concrete colours. */
const TOKENS = ["--expense", "--income", "--debt", "--transfer", "--primary", "--border", "--muted-foreground", "--foreground", "--popover", "--muted"] as const;

type Token = (typeof TOKENS)[number];
export type ThemeColors = Record<Token extends `--${infer N}` ? N : never, string>;

/** Light-theme values, used during SSR before the real ones can be read. */
const FALLBACK = "#e5484d|#0e9f6e|#d97706|#7c3aed|#2d7eb5|#c9dae8|#5a6a7a|#1a2332|#ffffff|#e4eef6";

function subscribe(onChange: () => void) {
  // The theme toggles the `dark` class on <html>.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function snapshot() {
  const styles = getComputedStyle(document.documentElement);
  return TOKENS.map((t) => styles.getPropertyValue(t).trim()).join("|");
}

/**
 * Resolved theme colours for SVG libraries (Recharts writes colours as SVG
 * attributes; resolving `var(--x)` there isn't guaranteed on every browser).
 * Re-renders when the light/dark theme changes.
 */
export function useThemeColors(): ThemeColors {
  const raw = useSyncExternalStore(subscribe, snapshot, () => FALLBACK);
  return useMemo(() => {
    const values = raw.split("|");
    return Object.fromEntries(TOKENS.map((t, i) => [t.slice(2), values[i]])) as ThemeColors;
  }, [raw]);
}
