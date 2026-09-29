"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Loader2 } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-browser-state";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Pull distance (after resistance) that triggers a refresh on release. */
const THRESHOLD = 64;
const MAX_PULL = 96;
/** Finger travel is halved so the indicator feels weighted. */
const RESISTANCE = 0.5;

/**
 * Pull-to-refresh for the installed PWA, which has no browser reload button.
 * In a normal browser tab the native gesture already exists, so this stays off.
 * Refreshes server data in place (router.refresh), keeping client state.
 */
export function PullToRefresh() {
  const standalone = useMediaQuery("(display-mode: standalone)");
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, startRefresh] = useTransition();
  const gesture = useRef({ startY: 0, active: false, armed: false });

  useEffect(() => {
    if (!standalone) return;

    function onStart(e: TouchEvent) {
      const g = gesture.current;
      g.active = false;
      if (e.touches.length !== 1 || window.scrollY > 0) return;
      // Sheets have their own swipe-down gesture; never fight them.
      if (document.querySelector('[role="dialog"]')) return;
      g.startY = e.touches[0].clientY;
      g.active = true;
      g.armed = false;
    }

    function onMove(e: TouchEvent) {
      const g = gesture.current;
      if (!g.active) return;
      const dy = e.touches[0].clientY - g.startY;
      if (dy <= 0 || window.scrollY > 0) {
        setPull(0);
        return;
      }
      const distance = Math.min(dy * RESISTANCE, MAX_PULL);
      setPull(distance);
      const armed = distance >= THRESHOLD;
      if (armed && !g.armed) haptic();
      g.armed = armed;
    }

    function onEnd() {
      const g = gesture.current;
      if (!g.active) return;
      g.active = false;
      setPull(0);
      if (g.armed) startRefresh(() => router.refresh());
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [standalone, router]);

  if (!standalone || (pull === 0 && !refreshing)) return null;

  const offset = refreshing ? THRESHOLD : pull;
  const armed = pull >= THRESHOLD;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
      // Emerges from under the fixed mobile header (56px tall).
      style={{ transform: `translateY(calc(${56 + offset - 40}px + env(safe-area-inset-top)))` }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-md">
        {refreshing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="sr-only">Actualizando</span>
          </>
        ) : (
          <ArrowDown
            className={cn("h-5 w-5 text-muted-foreground transition-transform", armed && "rotate-180 text-primary")}
          />
        )}
      </div>
    </div>
  );
}
