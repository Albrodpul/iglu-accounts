"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

const dialogContentVariants = {
  // Centered modal at every breakpoint (default).
  default:
    "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg bg-background p-4 text-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  // Bottom sheet on phones, centered modal from `sm` up.
  sheet:
    "fixed inset-x-0 bottom-0 z-50 flex h-[94dvh] max-h-[94dvh] w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl border border-border bg-card p-0 text-sm ring-1 ring-foreground/10 duration-200 outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:h-auto sm:max-h-[88dvh] sm:max-w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:duration-100 sm:data-open:zoom-in-95 sm:data-open:slide-in-from-bottom-0 sm:data-closed:zoom-out-95 sm:data-closed:slide-out-to-bottom-0",
} as const

/**
 * Swipe-down-to-dismiss for the `sheet` variant on touch devices. Drags the
 * popup with the finger and closes past a threshold; only engages when the
 * gesture starts at the top of the scrollable body so inner scrolling wins.
 */
function useSwipeToDismiss(enabled: boolean) {
  const popupRef = React.useRef<HTMLDivElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const gesture = React.useRef({ y: 0, dragging: false, delta: 0, scrollEl: null as HTMLElement | null })

  function setTranslate(dy: number, animate: boolean) {
    const el = popupRef.current
    if (!el) return
    el.style.transition = animate ? "transform 0.2s ease" : "none"
    el.style.transform = dy ? `translateY(${dy}px)` : ""
  }

  function onTouchStart(e: React.TouchEvent) {
    if (!enabled || e.touches.length !== 1) return
    const t = e.touches[0]
    const target = e.target as HTMLElement
    gesture.current = {
      y: t.clientY,
      dragging: false,
      delta: 0,
      scrollEl: target.closest<HTMLElement>('[data-slot="dialog-body"], .overflow-y-auto'),
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    const g = gesture.current
    if (!enabled || !e.touches.length) return
    const dy = e.touches[0].clientY - g.y
    if (!g.dragging) {
      const atTop = !g.scrollEl || g.scrollEl.scrollTop <= 0
      if (dy > 8 && atTop) g.dragging = true
      else return
    }
    if (dy < 0) {
      g.delta = 0
      setTranslate(0, false)
      return
    }
    g.delta = dy
    setTranslate(dy, false)
    if (e.cancelable) e.preventDefault()
  }

  function onTouchEnd() {
    const g = gesture.current
    if (!g.dragging) return
    g.dragging = false
    if (g.delta > 120) {
      setTranslate(0, false)
      closeRef.current?.click()
    } else {
      setTranslate(0, true)
    }
  }

  return { popupRef, closeRef, handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd } }
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  variant = "default",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  variant?: keyof typeof dialogContentVariants
}) {
  const isSheet = variant === "sheet"
  const { popupRef, closeRef, handlers } = useSwipeToDismiss(isSheet)
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={isSheet ? popupRef : undefined}
        data-slot="dialog-content"
        className={cn(dialogContentVariants[variant], className)}
        {...(isSheet ? handlers : {})}
        {...props}
      >
        {isSheet && (
          <>
            <div
              aria-hidden
              className="absolute top-2 left-1/2 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/25 sm:hidden"
            />
            <DialogPrimitive.Close
              ref={closeRef}
              aria-hidden
              tabIndex={-1}
              className="hidden"
            />
          </>
        )}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2 z-10"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({
  className,
  variant = "plain",
  ...props
}: React.ComponentProps<"div"> & {
  /** `bar`: title bar pinned above a scrollable `DialogBody`. */
  variant?: "plain" | "bar"
}) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex shrink-0 flex-col gap-1",
        variant === "bar"
          ? "border-b border-border/70 bg-muted/45 px-5 pt-7 pb-3 pr-12 sm:py-4"
          : "gap-2",
        className
      )}
      {...props}
    />
  )
}

/** Scrollable content region of a dialog. Owns the only scrollbar. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-4",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
