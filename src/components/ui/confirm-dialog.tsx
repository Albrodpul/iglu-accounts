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
      <DialogContent variant="sheet" className="sm:max-w-sm" showCloseButton={!pending}>
        <DialogHeader className="px-5 pt-7 pr-12 pb-2 sm:pt-5">
          <DialogTitle>{options.title || "Confirmar"}</DialogTitle>
          <DialogDescription className="pt-1">
            {options.description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-auto flex shrink-0 flex-col-reverse gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:mt-0 sm:flex-row sm:border-0 sm:pb-5">
          <Button
            variant="outline"
            className="h-12 w-full md:h-10 md:flex-1"
            onClick={() => close(false)}
            disabled={pending}
          >
            {options.cancelLabel || "Cancelar"}
          </Button>
          <Button
            variant={options.variant === "destructive" ? "destructive" : "default"}
            className="h-12 w-full md:h-10 md:flex-1"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Procesando..." : options.confirmLabel || "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
