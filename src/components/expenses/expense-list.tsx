"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteExpense } from "@/actions/expenses";
import { formatDateShort, formatDateWithYear } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { MovementDialog } from "./movement-dialog";
import { Pencil, Trash2, ArrowUpDown, Loader2 } from "lucide-react";
import type { Category, ExpenseWithCategory } from "@/types";

type Props = {
  expenses: ExpenseWithCategory[];
  categories: Category[];
  sortable?: boolean;
  externalSortAsc?: boolean;
  showYear?: boolean;
  hasInvestments?: boolean;
  debtCategoryId?: string | null;
  transferCategoryId?: string | null;
  onMutated?: () => void;
};

export function ExpenseList({ expenses, categories, sortable = true, externalSortAsc, showYear = false, hasInvestments = false, debtCategoryId = null, transferCategoryId = null, onMutated }: Props) {
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [internalSortAsc, setInternalSortAsc] = useState(false);
  const sortAsc = sortable ? internalSortAsc : (externalSortAsc ?? false);
  const { confirm, ConfirmDialog } = useConfirm();
  const router = useRouter();

  const notifyMutated = onMutated ?? (() => router.refresh());

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

  async function handleDelete(expense: ExpenseWithCategory) {
    const isTransfer = !!(transferCategoryId && expense.category_id === transferCategoryId);
    const ok = await confirm({
      title: isTransfer ? "Eliminar traspaso" : "Eliminar movimiento",
      description: isTransfer
        ? "Este traspaso está vinculado a dos movimientos. Se eliminarán ambos. Esta acción no se puede deshacer."
        : "¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (ok) {
      setDeletingId(expense.id);
      try {
        const result = await deleteExpense(expense.id);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success(isTransfer ? "Traspaso eliminado" : "Movimiento eliminado");
          notifyMutated();
        }
      } finally {
        setDeletingId(null);
      }
    }
  }

  return (
    <>
      {sortable && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setInternalSortAsc(!internalSortAsc)}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground cursor-pointer"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {internalSortAsc ? "Más antiguo primero" : "Más reciente primero"}
          </button>
        </div>
      )}

      <div className="space-y-0">
        {sortedDates.map((date, dateIndex) => {
          const dayExpenses = grouped[date];
          const dayTotal = dayExpenses
            .filter((e) => !debtCategoryId || e.category_id !== debtCategoryId)
            .filter((e) => !transferCategoryId || e.category_id !== transferCategoryId)
            .reduce((s, e) => s + e.amount, 0);

          return (
            <div key={date}>
              {dateIndex > 0 && (
                <div className="my-1 border-t border-border/40" />
              )}
              <div className="mb-2 mt-3 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {showYear ? formatDateWithYear(date) : formatDateShort(date)}
                </span>
                <span
                  className={`text-xs font-bold tabular-nums ${dayTotal >= 0 ? "text-income" : "text-expense"}`}
                >
                  <Amount value={dayTotal} />
                </span>
              </div>
              <div className="space-y-1">
                {dayExpenses.map((expense) => {
                  const isDeleting = deletingId === expense.id;
                  return (
                  <div
                    key={expense.id}
                    className={`group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border/70 hover:bg-muted/35 ${isDeleting ? "opacity-50" : ""}`}
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
                      <p className="text-[15px] font-medium text-foreground break-words">
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
                        className={`text-[15px] font-semibold tabular-nums ${
                          transferCategoryId && expense.category_id === transferCategoryId
                            ? "text-violet-400"
                            : debtCategoryId && expense.category_id === debtCategoryId
                              ? "text-sky-400"
                              : expense.amount >= 0
                                ? "text-income"
                                : "text-foreground"
                        }`}
                      >
                        <Amount value={expense.amount} />
                      </span>
                      <div className="flex items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                          onClick={() => setEditingExpense(expense)}
                          disabled={isDeleting}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-expense transition-colors disabled:opacity-100"
                          onClick={() => handleDelete(expense)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {editingExpense && (
        <MovementDialog
          open
          onOpenChange={() => setEditingExpense(null)}
          categories={categories}
          expense={editingExpense}
          hasInvestments={hasInvestments}
          onSuccess={() => { setEditingExpense(null); notifyMutated(); }}
        />
      )}

      {ConfirmDialog}
    </>
  );
}
