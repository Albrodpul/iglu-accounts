"use client";

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
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet" className="sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader variant="bar">
          <DialogTitle>
            {expense ? "Editar movimiento" : "Nuevo movimiento"}
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
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
