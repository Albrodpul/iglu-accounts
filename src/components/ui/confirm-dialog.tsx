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
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-lg border border-border bg-card p-0 sm:max-w-sm">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle>{options.title || "Confirmar"}</DialogTitle>
          <DialogDescription className="pt-1">
            {options.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 px-5 pb-5 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleClose(false)}
          >
            {options.cancelLabel || "Cancelar"}
          </Button>
          <Button
            variant={options.variant === "destructive" ? "destructive" : "default"}
            className={`flex-1 ${options.variant !== "destructive" ? "" : ""}`}
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
