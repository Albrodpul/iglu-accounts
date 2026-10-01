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

type Props = {
  /** Fired on a tap that isn't a swipe (e.g. open the editor). */
  onTap?: () => void;
  /** Fired when the row is swiped left past the threshold. */
  onDelete?: () => void;
  /** Fired when the row is swiped right past the threshold. */
  onDuplicate?: () => void;
  /** Play a one-off nudge that reveals both actions, to teach the gesture. */
  peek?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Touch-friendly list row: tap to act, swipe left to delete, swipe right to
 * duplicate. Pointer/mouse use is unaffected — only touch gestures are
 * intercepted, so desktop hover controls keep working. `onDelete` should still
 * confirm (or be undoable); the swipe only triggers intent.
 */
export function SwipeRow({ onTap, onDelete, onDuplicate, peek = false, disabled, className, children }: Props) {
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
  });

  function onTouchStart(e: React.TouchEvent) {
    if (disabled || e.touches.length !== 1) return;
    const t = e.touches[0];
    gesture.current = { x: t.clientX, y: t.clientY, active: true, horizontal: false, moved: false, armed: false };
  }

  function onTouchMove(e: React.TouchEvent) {
    const g = gesture.current;
    if (!g.active) return;
    const t = e.touches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;

    if (!g.horizontal) {
      if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return;
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
    const g = gesture.current;
    g.active = false;
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
          className="absolute inset-y-0 left-0 flex items-center justify-start bg-primary pl-5 text-primary-foreground"
          style={{ width: ACTION_WIDTH + 20, opacity: offset > 0 || peeking ? 1 : 0 }}
        >
          <Copy className="h-5 w-5" />
        </div>
      )}
      {onDelete && (
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-expense pr-5 text-white"
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
        onClick={onTap ? () => onTap() : undefined}
        onAnimationEnd={peeking ? () => setPeekDone(true) : undefined}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className={cn(
          "relative touch-pan-y",
          moved && "bg-card",
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
