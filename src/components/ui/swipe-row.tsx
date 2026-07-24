"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_WIDTH = 76;
/** Drag past this (px) on release to fire the delete action. */
const TRIGGER = 52;
/** Ignore movements smaller than this so taps still register. */
const TAP_SLOP = 8;

type Props = {
  /** Fired on a tap that isn't a swipe (e.g. open the editor). */
  onTap?: () => void;
  /** Fired when the row is swiped left past the threshold. */
  onDelete?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Touch-friendly list row: tap to act, swipe left to delete. Pointer/mouse use
 * is unaffected — only touch gestures are intercepted, so desktop hover controls
 * keep working. `onDelete` should still confirm; the swipe only triggers intent.
 */
export function SwipeRow({ onTap, onDelete, disabled, className, children }: Props) {
  const [offset, setOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const gesture = React.useRef({
    x: 0,
    y: 0,
    active: false,
    horizontal: false,
    moved: false,
  });

  function onTouchStart(e: React.TouchEvent) {
    if (disabled || e.touches.length !== 1) return;
    const t = e.touches[0];
    gesture.current = { x: t.clientX, y: t.clientY, active: true, horizontal: false, moved: false };
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
    // Left only, with a little rubber-banding past the action width.
    const next = Math.max(-ACTION_WIDTH - 20, Math.min(0, dx));
    setOffset(next);
    if (e.cancelable) e.preventDefault();
  }

  function onTouchEnd() {
    const g = gesture.current;
    g.active = false;
    setDragging(false);
    if (!g.horizontal) return;
    if (onDelete && offset <= -TRIGGER) {
      setOffset(0);
      onDelete();
    } else {
      setOffset(0);
    }
  }

  function handleClickCapture(e: React.MouseEvent) {
    // Suppress the click synthesized after a swipe so it doesn't also edit.
    if (gesture.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      gesture.current.moved = false;
    }
  }

  const revealed = offset < 0;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {onDelete && (
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-expense pr-5 text-white"
          style={{ width: ACTION_WIDTH + 20, opacity: revealed ? 1 : 0 }}
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
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className={cn(
          "relative touch-pan-y",
          revealed && "bg-card",
          onTap && "cursor-pointer",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
