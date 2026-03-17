"use client";

import { useState } from "react";
import { deleteExpense } from "@/actions/expenses";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "./expense-form";
import { Pencil, Trash2 } from "lucide-react";
import type { Account, Category, ExpenseWithCategory } from "@/types";

type Props = {
  expenses: ExpenseWithCategory[];
  categories: Category[];
  accounts?: Account[];
};

export function ExpenseList({ expenses, categories, accounts }: Props) {
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null);

  if (expenses.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
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

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  async function handleDelete(id: string) {
    if (confirm("¿Eliminar este movimiento?")) {
      await deleteExpense(id);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {sortedDates.map((date) => {
          const dayExpenses = grouped[date];
          const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

          return (
            <div key={date} className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-500">
                  {formatDateShort(date)}
                </h3>
                <span
                  className={`text-sm font-semibold ${dayTotal >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(dayTotal)}
                </span>
              </div>
              <div className="space-y-1">
                {dayExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between bg-card rounded px-3 py-2 border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className="shrink-0"
                        style={{
                          borderColor: expense.category?.color || "#64748b",
                          color: expense.category?.color || "#64748b",
                        }}
                      >
                        {expense.category?.icon} {expense.category?.name}
                      </Badge>
                      <span className="text-sm truncate">{expense.concept}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-sm font-medium ${expense.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(expense.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingExpense(expense)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar movimiento</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              categories={categories}
              accounts={accounts}
              expense={editingExpense}
              onSuccess={() => setEditingExpense(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
