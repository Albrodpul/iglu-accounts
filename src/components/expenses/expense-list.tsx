"use client";

import { useState } from "react";
import { deleteExpense } from "@/actions/expenses";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ExpenseForm } from "./expense-form";
import { Pencil, Trash2, ArrowUpDown } from "lucide-react";
import type { Category, ExpenseWithCategory } from "@/types";

type Props = {
  expenses: ExpenseWithCategory[];
  categories: Category[];
  sortable?: boolean;
  hasInvestments?: boolean;
};

export function ExpenseList({ expenses, categories, sortable = true, hasInvestments = false }: Props) {
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  if (expenses.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay movimientos en este periodo
      </p>
    );
  }

  // Group by date
  const grouped = expenses.reduce(
    (acc, expense) => {
      const date = expense.expense_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(expense);
      return acc;
    },
    {} as Record<string, ExpenseWithCategory[]>
  );

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    sortAsc ? a.localeCompare(b) : b.localeCompare(a)
  );

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Eliminar movimiento",
      description: "¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (ok) {
      const result = await deleteExpense(id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Movimiento eliminado");
      }
    }
  }

  return (
    <>
      {sortable && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground cursor-pointer"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortAsc ? "Más antiguo primero" : "Más reciente primero"}
          </button>
        </div>
      )}

      <div className="space-y-0">
        {sortedDates.map((date, dateIndex) => {
          const dayExpenses = grouped[date];
          const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

          return (
            <div key={date}>
              {dateIndex > 0 && (
                <div className="my-1 border-t border-border/40" />
              )}
              <div className="mb-2 mt-3 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {formatDateShort(date)}
                </span>
                <span
                  className={`text-xs font-bold tabular-nums ${dayTotal >= 0 ? "text-income" : "text-expense"}`}
                >
                  {formatCurrency(dayTotal)}
                </span>
              </div>
              <div className="space-y-1">
                {dayExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="group flex items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 transition-colors hover:border-border/70 hover:bg-muted/35"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                      style={{
                        backgroundColor: (expense.category?.color || "#64748b") + "15",
                      }}
                    >
                      {expense.category?.icon || "📦"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-foreground truncate">
                        {expense.concept}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category?.name}
                        {hasInvestments && expense.payment_method === "cash" && (
                          <span className="ml-1.5 text-xs text-muted-foreground/70">· Efectivo</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[15px] font-semibold tabular-nums ${expense.amount >= 0 ? "text-income" : "text-foreground"}`}
                      >
                        {formatCurrency(expense.amount)}
                      </span>
                      <div className="flex items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setEditingExpense(expense)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-expense transition-colors"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>Editar movimiento</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4">
            {editingExpense && (
              <ExpenseForm
                categories={categories}
                expense={editingExpense}
                onSuccess={() => setEditingExpense(null)}
                hasInvestments={hasInvestments}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
