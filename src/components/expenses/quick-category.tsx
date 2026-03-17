"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryForm } from "@/components/settings/category-form";
import { Plus } from "lucide-react";

type Props = {
  onCreated?: () => void;
};

export function QuickCategoryButton({ onCreated }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Nueva categoría
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4">
            <CategoryForm
              onSuccess={() => {
                setOpen(false);
                onCreated?.();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
