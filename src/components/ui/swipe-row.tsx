"use client";

import * as React from "react";
import { Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const ACTION_WIDTH = 76;
/** Drag past this (px) on release to fire the action. */
const TRIGGER = 52;
/** Ignore movements smaller than this so taps still register. */
const TAP_SLOP = 8;
/** Hold still this long (ms) for a long press. */
const LONG_PRESS = 450;

type Props = {
  /** Fired on a tap that isn't a swipe (e.g. open the editor). */
  onTap?: () => void;
  /** Fired when the row is swiped left past the threshold. */
  onDelete?: () => void;
  /** Fired when the row is swiped right past the threshold. */
  onDuplicate?: () => void;
  /** Fired when a finger rests on the row without moving (e.g. start selecting). */
  onLongPress?: () => void;
  /** Play a one-off nudge that reveals both actions, to teach the gesture. */
  peek?: boolean;
  /** Turns the swipes and the long press off; taps keep working. */
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Touch-friendly list row: tap to act, swipe left to delete, swipe right to
 * duplicate, hold to long-press. Pointer/mouse use is unaffected — only touch gestures are
 * intercepted, so desktop hover controls keep working. `onDelete` should still
 * confirm (or be undoable); the swipe only triggers intent.
 */
export function SwipeRow({ onTap, onDelete, onDuplicate, onLongPress, peek = false, disabled, className, children }: Props) {
  const [offset, setOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [peekDone, setPeekDone] = React.useState(false);
  const gesture = React.useRef({
    x: 0,
    y: 0,
    active: false,
    horizontal: false,
    moved: false,
    armed: false,
    touching: false,
  });
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  React.useEffect(() => cancelPress, []);

  function onTouchStart(e: React.TouchEvent) {
    cancelPress();
    const t = e.touches[0];
    if (!t) return;
    const active = !disabled && e.touches.length === 1;
    // Reset even when disabled: a stale `moved` would swallow the next tap.
    gesture.current = { x: t.clientX, y: t.clientY, active, horizontal: false, moved: false, armed: false, touching: true };
    if (!active || !onLongPress) return;
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      const g = gesture.current;
      if (!g.active || g.horizontal) return;
      // The press is the whole gesture: no swipe after it, and no tap on release.
      g.active = false;
      g.moved = true;
      haptic(20);
      onLongPress();
    }, LONG_PRESS);
  }

  function onTouchMove(e: React.TouchEvent) {
    const g = gesture.current;
    if (!g.active) return;
    const t = e.touches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;

    if (!g.horizontal) {
      if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return;
      cancelPress();
      if (Math.abs(dx) > Math.abs(dy)) {
        g.horizontal = true;
        setDragging(true);
      } else {
        // Vertical intent → let the list scroll, abandon the gesture.
        g.active = false;
        return;
      }
    }

    g.moved = true;
    // Only towards sides that have an action, with a little rubber-banding.
    const limit = ACTION_WIDTH + 20;
    const next = Math.max(onDelete ? -limit : 0, Math.min(onDuplicate ? limit : 0, dx));
    setOffset(next);
    // Buzz once when the release would fire an action, and again if re-armed.
    const armed = Math.abs(next) >= TRIGGER;
    if (armed && !g.armed) haptic();
    g.armed = armed;
    if (e.cancelable) e.preventDefault();
  }

  function onTouchEnd() {
    cancelPress();
    const g = gesture.current;
    g.active = false;
    g.touching = false;
    setDragging(false);
    if (!g.horizontal) return;
    const released = offset;
    setOffset(0);
    if (onDelete && released <= -TRIGGER) onDelete();
    else if (onDuplicate && released >= TRIGGER) onDuplicate();
  }

  function handleClickCapture(e: React.MouseEvent) {
    // Suppress the click synthesized after a swipe so it doesn't also edit.
    if (gesture.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      gesture.current.moved = false;
    }
  }

  const peeking = peek && !peekDone && offset === 0 && !dragging;
  const moved = offset !== 0 || peeking;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {onDuplicate && (
        <div
          aria-hidden
          // Kept 1px inside the rounded clip: on its antialiased edge the colour would bleed around the row.
          className="absolute inset-y-px left-px flex items-center justify-start rounded-lg bg-primary pl-5 text-primary-foreground"
          style={{ width: ACTION_WIDTH + 20, opacity: offset > 0 || peeking ? 1 : 0 }}
        >
          <Copy className="h-5 w-5" />
        </div>
      )}
      {onDelete && (
        <div
          aria-hidden
          className="absolute inset-y-px right-px flex items-center justify-end rounded-lg bg-expense pr-5 text-white"
          style={{ width: ACTION_WIDTH + 20, opacity: offset < 0 || peeking ? 1 : 0 }}
        >
          <Trash2 className="h-5 w-5" />
        </div>
      )}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClickCapture={handleClickCapture}
        // Holding a finger down would otherwise also open the browser's own menu.
        onContextMenu={onLongPress ? (e) => { if (gesture.current.touching || gesture.current.moved) e.preventDefault(); } : undefined}
        onClick={onTap ? () => onTap() : undefined}
        onAnimationEnd={peeking ? () => setPeekDone(true) : undefined}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className={cn(
          "relative touch-pan-y",
          // A long press must not start selecting the row's text on phones.
          onLongPress && "[@media(pointer:coarse)]:select-none [@media(pointer:coarse)]:[-webkit-touch-callout:none]",
          // Square corners while displaced: rounded ones would let the action
          // colours underneath show through at the four corners.
          moved && "bg-card !rounded-none",
          peeking && "swipe-peek",
          onTap && "cursor-pointer",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
