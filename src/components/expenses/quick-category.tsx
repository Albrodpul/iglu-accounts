"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
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
        <DialogContent variant="sheet" className="sm:max-w-sm">
          <DialogHeader variant="bar">
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <CategoryForm
              onSuccess={() => {
                setOpen(false);
                onCreated?.();
              }}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
