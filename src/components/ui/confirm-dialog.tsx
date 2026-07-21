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

type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
};

export function useConfirm() {
  const [open, setOpen] = useState(false);
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

  function handleClose(confirmed: boolean) {
    setOpen(false);
    resolveRef.current?.(confirmed);
  }

  const ConfirmDialog = (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(false); }}>
      <DialogContent variant="sheet" className="sm:max-w-sm">
        <DialogHeader className="px-5 pt-7 pr-12 pb-2 sm:pt-5">
          <DialogTitle>{options.title || "Confirmar"}</DialogTitle>
          <DialogDescription className="pt-1">
            {options.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 flex-col-reverse gap-2 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row">
          <Button
            variant="outline"
            className="h-12 flex-1 md:h-10"
            onClick={() => handleClose(false)}
          >
            {options.cancelLabel || "Cancelar"}
          </Button>
          <Button
            variant={options.variant === "destructive" ? "destructive" : "default"}
            className="h-12 flex-1 md:h-10"
            onClick={() => handleClose(true)}
          >
            {options.confirmLabel || "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
