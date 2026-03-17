"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "./expense-form";
import type { Category } from "@/types";

type Props = {
  categories: Category[];
};

export function AddExpenseFab({ categories }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-8 z-50 hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_14px_30px_-14px_rgba(32,87,75,0.85)] md:flex"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>Nuevo movimiento</DialogTitle>
            <DialogDescription>
              Registra un gasto o ingreso en pocos segundos.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">
            <ExpenseForm
              categories={categories}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
