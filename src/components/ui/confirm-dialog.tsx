"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  /**
   * Optional async work to run while the dialog stays open, showing a spinner
   * on the confirm button. The dialog closes when it settles. Prefer this over
   * running the action after `await confirm(...)` so the user gets feedback.
   */
  onConfirm?: () => Promise<unknown>;
};

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    description: "",
  });
  const resolveRef = useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function close(confirmed: boolean) {
    setOpen(false);
    resolveRef.current?.(confirmed);
  }

  async function handleConfirm() {
    if (options.onConfirm) {
      setPending(true);
      try {
        await options.onConfirm();
      } finally {
        setPending(false);
      }
    }
    close(true);
  }

  const ConfirmDialog = (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v && !pending) close(false); }}
    >
      {/* A question and two buttons: as tall as that, not a full-height sheet. */}
      <DialogContent variant="menu" className="sm:max-w-sm" showCloseButton={!pending}>
        <DialogHeader className="px-5 pt-7 pr-12 pb-2 sm:pt-5">
          <DialogTitle>{options.title || "Confirmar"}</DialogTitle>
          <DialogDescription className="pt-1">
            {options.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 flex-col-reverse gap-2 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:pb-5">
          {/* The action comes first in the DOM: with `flex-col-reverse` it sits at the
              bottom on phones, where every other sheet keeps its main button. */}
          <Button
            variant={options.variant === "destructive" ? "destructive" : "default"}
            className="h-12 w-full sm:order-2 md:h-10 md:flex-1"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Procesando..." : options.confirmLabel || "Confirmar"}
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full sm:order-1 md:h-10 md:flex-1"
            onClick={() => close(false)}
            disabled={pending}
          >
            {options.cancelLabel || "Cancelar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
