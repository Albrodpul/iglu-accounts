"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteExpense } from "@/actions/expenses";
import { formatDateShort, formatDateWithYear } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import { useUndoableDelete } from "@/hooks/use-undoable-delete";
import { MovementDialog } from "./movement-dialog";
import { SwipeRow } from "@/components/ui/swipe-row";
import { EmptyState } from "@/components/ui/empty-state";
import { openAddMovement } from "@/lib/add-movement";
import { Pencil, Trash2, ArrowUpDown, ReceiptText } from "lucide-react";
import type { Category, ExpenseWithCategory } from "@/types";

/**
 * Undo-delete key: both legs of a transfer share their pair id, so deleting
 * one hides the other too (the server deletes the pair together).
 */
function deleteKey(expense: ExpenseWithCategory): string {
  return expense.transfer_pair_id ? `pair:${expense.transfer_pair_id}` : expense.id;
}

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
  const [internalSortAsc, setInternalSortAsc] = useState(false);
  const sortAsc = sortable ? internalSortAsc : (externalSortAsc ?? false);
  const { pendingIds, scheduleDelete } = useUndoableDelete();
  const router = useRouter();

  const notifyMutated = onMutated ?? (() => router.refresh());

  // Rows deleted but still inside their undo window are hidden right away.
  const visibleExpenses = expenses.filter((e) => !pendingIds.has(deleteKey(e)));

  if (visibleExpenses.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        message="No hay movimientos en este periodo"
        action={{ label: "Añadir movimiento", onClick: openAddMovement }}
      />
    );
  }

  // Group by date
  const grouped = visibleExpenses.reduce(
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

  function handleDelete(expense: ExpenseWithCategory) {
    const isTransfer = !!(transferCategoryId && expense.category_id === transferCategoryId);
    scheduleDelete(deleteKey(expense), {
      // A transfer is two linked movements; the server removes both, and the
      // shared key hides both legs during the undo window.
      message: isTransfer ? "Traspaso eliminado" : "Movimiento eliminado",
      commit: () => deleteExpense(expense.id),
      onCommitted: notifyMutated,
    });
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
                {dayExpenses.map((expense) => (
                  <SwipeRow
                    key={expense.id}
                    onTap={() => setEditingExpense(expense)}
                    onDelete={() => handleDelete(expense)}
                    className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border/70 hover:bg-muted/35"
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
                      <div className="hidden items-center md:flex md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                          onClick={(e) => { e.stopPropagation(); setEditingExpense(expense); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-expense transition-colors disabled:opacity-100"
                          onClick={(e) => { e.stopPropagation(); handleDelete(expense); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </SwipeRow>
                ))}
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
          onDelete={() => {
            setEditingExpense(null);
            handleDelete(editingExpense);
          }}
        />
      )}

    </>
  );
}
