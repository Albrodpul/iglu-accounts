"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 650;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Rolls a displayed number from its previous value to the new one whenever it
 * changes (e.g. a total after adding a movement). The first render shows the
 * real value straight away — counting up from 0 would briefly show a false
 * amount. Honours prefers-reduced-motion.
 */
export function useRollingNumber(value: number, enabled: boolean): number {
  const [last, setLast] = useState(value);
  const [roll, setRoll] = useState<{ from: number; to: number } | null>(null);
  const [frame, setFrame] = useState<number | null>(null);

  // What is on screen right now: mid-roll frame, roll start, or the settled value.
  const shown = frame ?? roll?.from ?? last;

  // A new value arrived: start rolling from whatever is currently displayed.
  if (value !== last) {
    setLast(value);
    if (enabled) setRoll({ from: shown, to: value });
  }

  useEffect(() => {
    if (!roll) return;
    let raf = 0;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();

    const step = (now: number) => {
      const t = reduced ? 1 : Math.min((now - start) / DURATION_MS, 1);
      if (t >= 1) {
        setFrame(null);
        setRoll(null);
        return;
      }
      setFrame(roll.from + (roll.to - roll.from) * easeOutCubic(t));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [roll]);

  return roll ? shown : value;
}
