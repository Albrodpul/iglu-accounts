"use client";

import { useState, useRef } from "react";
import { createExpense, updateExpense } from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Category, Expense } from "@/types";

type Props = {
  categories: Category[];
  expense?: Expense;
  onSuccess?: () => void;
};

export function ExpenseForm({ categories, expense, onSuccess }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isIncome, setIsIncome] = useState(expense ? expense.amount > 0 : false);
  const formRef = useRef<HTMLFormElement>(null);

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
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success(expense ? "Movimiento actualizado" : isIncome ? "Ingreso añadido" : "Gasto añadido");
      setLoading(false);
      if (!expense) formRef.current?.reset();
      onSuccess?.();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-4 md:grid-cols-2 md:gap-x-5 md:gap-y-4">
      <div className="flex gap-2 md:col-span-2">
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

      <div className="grid grid-cols-2 gap-4 md:col-span-2">
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

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="concept">Concepto</Label>
        <Input
          id="concept"
          name="concept"
          defaultValue={expense?.concept || ""}
          placeholder="Ej: Compra supermercado"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category_id">Categoría</Label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={expense?.category_id || (categories.length === 1 ? categories[0].id : "")}
          required
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      <div className="space-y-2 md:col-span-2">
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
        <p className="rounded bg-red-50 p-2 text-sm text-red-600 md:col-span-2">{error}</p>
      )}

      <Button type="submit" className="w-full md:col-span-2" disabled={loading}>
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
