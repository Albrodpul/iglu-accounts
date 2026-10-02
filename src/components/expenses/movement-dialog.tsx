"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "./expense-form";
import type { Category, Expense } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** Present when editing an existing movement. */
  expense?: Expense;
  hasInvestments?: boolean;
  onSuccess?: () => void;
  /** Edit mode: delete the movement (the dialog should close first). */
  onDelete?: () => void;
  /** Edit mode: start a new movement copied from this one. */
  onDuplicate?: () => void;
  /** Create mode: prefill from this movement (dated today). */
  prefill?: Expense;
};

/**
 * Bottom sheet on phones, centered dialog from `sm` up.
 * Single source of truth for the create/edit movement modal.
 */
export function MovementDialog({
  open,
  onOpenChange,
  categories,
  expense,
  hasInvestments = false,
  onSuccess,
  onDelete,
  onDuplicate,
  prefill,
}: Props) {
  const amountRef = useRef<HTMLInputElement>(null);
  // A brand-new movement almost always starts with the amount: focus it so the
  // numeric keypad is already up. Editing or duplicating starts from a full form.
  const startAtAmount = !expense && !prefill;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="sheet"
        className="sm:max-w-2xl lg:max-w-3xl"
        initialFocus={startAtAmount ? amountRef : undefined}
      >
        <DialogHeader variant="bar">
          <DialogTitle>
            {expense ? "Editar movimiento" : prefill ? "Duplicar movimiento" : "Nuevo movimiento"}
          </DialogTitle>
          <DialogDescription className="hidden sm:block">
            Registra un gasto o ingreso en pocos segundos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <ExpenseForm
            categories={categories}
            expense={expense}
            hasInvestments={hasInvestments}
            onSuccess={onSuccess}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            prefill={prefill}
            amountInputRef={amountRef}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
