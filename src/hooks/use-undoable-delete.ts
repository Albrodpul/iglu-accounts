"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const UNDO_WINDOW_MS = 5000;

type DeleteResult = { error?: string } | void | undefined;

type ScheduleOptions = {
  /** Toast text while the delete can still be undone, e.g. "Movimiento eliminado". */
  message: string;
  /** Performs the real delete. Return `{ error }` to surface a failure. */
  commit: () => Promise<DeleteResult>;
  /** Runs after a successful delete (e.g. refresh the list). */
  onCommitted?: () => void;
};

/**
 * Delete-with-undo: the item is hidden immediately and the real delete only
 * runs once the undo toast closes. Replaces a blocking confirm dialog for
 * single, easily-recreated items.
 *
 * Pending deletes are flushed (committed right away) when the component
 * unmounts or the page is backgrounded, so leaving never silently cancels a
 * delete the user already made.
 */
export function useUndoableDelete() {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  // id → commit function, for deletes still inside their undo window.
  const inFlight = useRef(new Map<string, () => Promise<void>>());

  const show = useCallback((id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const scheduleDelete = useCallback(
    (id: string, { message, commit, onCommitted }: ScheduleOptions) => {
      setPendingIds((prev) => new Set(prev).add(id));

      let settled = false;

      const runCommit = async () => {
        if (settled) return;
        settled = true;
        inFlight.current.delete(id);
        toast.dismiss(toastId);
        try {
          const result = await commit();
          if (result && result.error) {
            toast.error(result.error);
            show(id);
            return;
          }
          // Keep the id hidden: it disappears from the data on the next refresh.
          onCommitted?.();
        } catch {
          toast.error("No se pudo eliminar");
          show(id);
        }
      };

      const undo = () => {
        if (settled) return;
        settled = true;
        inFlight.current.delete(id);
        show(id);
      };

      // Callbacks above read `toastId` only when they fire, i.e. after this line.
      const toastId = toast(message, {
        duration: UNDO_WINDOW_MS,
        action: { label: "Deshacer", onClick: undo },
        onAutoClose: () => void runCommit(),
        onDismiss: () => void runCommit(),
      });
      inFlight.current.set(id, runCommit);
    },
    [show]
  );

  useEffect(() => {
    const pending = inFlight.current;
    const flush = () => {
      for (const commit of [...pending.values()]) void commit();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, []);

  return { pendingIds, scheduleDelete };
}
