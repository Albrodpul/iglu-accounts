"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/settings/category-form";
import { Plus } from "lucide-react";

type Props = {
  onCreated?: () => void;
  /** `link`: inline text action. `button`: full-width CTA for dialog footers. */
  appearance?: "link" | "button";
};

export function QuickCategoryButton({ onCreated, appearance = "link" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {appearance === "button" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-12 w-full md:h-10"
        >
          <Plus className="mr-1 h-4 w-4" />
          Nueva categoría
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva categoría
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent variant="sheet" className="sm:max-w-sm">
          <DialogHeader variant="bar">
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
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
