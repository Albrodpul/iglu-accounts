"use client";

import { useState } from "react";
import { createExpense, updateExpense } from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Account, Category, Expense } from "@/types";

type Props = {
  categories: Category[];
  accounts?: Account[];
  expense?: Expense;
  onSuccess?: () => void;
};

export function ExpenseForm({ categories, accounts, expense, onSuccess }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isIncome, setIsIncome] = useState(expense ? expense.amount > 0 : false);

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("is_income", String(isIncome));

    const result = expense
      ? await updateExpense(expense.id, formData)
      : await createExpense(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      onSuccess?.();
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={!isIncome ? "default" : "outline"}
          size="sm"
          onClick={() => setIsIncome(false)}
          className={!isIncome ? "bg-red-500 hover:bg-red-600 text-white" : ""}
        >
          Gasto
        </Button>
        <Button
          type="button"
          variant={isIncome ? "default" : "outline"}
          size="sm"
          onClick={() => setIsIncome(true)}
          className={isIncome ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
        >
          Ingreso
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Importe (EUR)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={expense ? Math.abs(expense.amount) : ""}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense_date">Fecha</Label>
          <Input
            id="expense_date"
            name="expense_date"
            type="date"
            defaultValue={expense?.expense_date || today}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept">Concepto</Label>
        <Input
          id="concept"
          name="concept"
          defaultValue={expense?.concept || ""}
          placeholder="Ej: Compra supermercado"
          required
        />
      </div>

      {accounts && accounts.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="account_id">Cuenta</Label>
          <select
            id="account_id"
            name="account_id"
            defaultValue={expense?.account_id || accounts.find((a) => a.is_default)?.id || ""}
            required
            className="flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.icon} {acc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="category_id">Categoría</Label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={expense?.category_id || ""}
          required
          className="flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            Selecciona categoría
          </option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={expense?.notes || ""}
          placeholder="Detalles adicionales..."
          rows={2}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? "Guardando..."
          : expense
            ? "Actualizar"
            : isIncome
              ? "Añadir ingreso"
              : "Añadir gasto"}
      </Button>
    </form>
  );
}
