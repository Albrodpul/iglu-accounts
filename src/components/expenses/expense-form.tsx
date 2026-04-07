"use client";

import { useState, useRef } from "react";
import { createExpense, updateExpense, createTransfer, checkDuplicate, suggestCategory } from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuickCategoryButton } from "@/components/expenses/quick-category";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Category, Expense } from "@/types";

type ExpenseType = "expense" | "income" | "debt" | "transfer";

type Props = {
  categories: Category[];
  expense?: Expense;
  onSuccess?: () => void;
  hasInvestments?: boolean;
};

function detectExpenseType(expense: Expense | undefined, categories: Category[]): ExpenseType {
  if (!expense) return "expense";
  if (expense.amount <= 0) return "expense";
  const cat = categories.find((c) => c.id === expense.category_id);
  if (cat?.name.toLowerCase() === "deuda") return "debt";
  return "income";
}

export function ExpenseForm({ categories, expense, onSuccess, hasInvestments = false }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<ExpenseType>(() => detectExpenseType(expense, categories));
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "cash">(expense?.payment_method || "bank");
  const [transferDirection, setTransferDirection] = useState<"bank_to_cash" | "cash_to_bank">("bank_to_cash");
  const [formKey, setFormKey] = useState(0);
  const [suggestedCat, setSuggestedCat] = useState<string | null>(null);
  const categoryManual = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const keepOpenRef = useRef(false);

  const today = new Date().toISOString().split("T")[0];
  const isTransfer = type === "transfer";
  const showCategory = type === "expense";
  const showPaymentMethod = hasInvestments && (type === "income" || type === "expense");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    let result;

    if (isTransfer) {
      formData.set("transfer_direction", transferDirection);
      result = await createTransfer(formData);
    } else {
      formData.set("is_income", String(type === "income"));
      formData.set("is_debt", String(type === "debt"));
      formData.set("payment_method", type === "debt" ? "bank" : paymentMethod);

      // Duplicate check for new expenses (not edits)
      if (!expense) {
        const rawAmount = parseFloat(formData.get("amount") as string);
        const categoryId = formData.get("category_id") as string;
        const expenseDate = formData.get("expense_date") as string;
        const isIncome = type === "income";
        const isDebt = type === "debt";
        const signedAmount = isIncome || isDebt ? Math.abs(rawAmount) : -Math.abs(rawAmount);

        if (categoryId && expenseDate && rawAmount) {
          const dup = await checkDuplicate({
            amount: signedAmount,
            category_id: categoryId,
            expense_date: expenseDate,
          });
          if (dup.duplicate) {
            const msg = dup.concept
              ? `Ya existe un movimiento similar: "${dup.concept}". ¿Añadir de todas formas?`
              : "Ya existe un movimiento con el mismo importe, categoría y fecha. ¿Añadir de todas formas?";
            if (!window.confirm(msg)) {
              setLoading(false);
              return;
            }
          }
        }
      }

      result = expense
        ? await updateExpense(expense.id, formData)
        : await createExpense(formData);
    }

    if (result?.error) {
      if (result.error === "No autenticado") {
        window.location.href = "/login";
        return;
      }

      setError(result.error);
      toast.error(result.error);
      setLoading(false);
    } else {
      const labels: Record<ExpenseType, string> = {
        expense: "Gasto",
        income: "Ingreso",
        debt: "Deuda",
        transfer: "Traspaso",
      };
      toast.success(expense ? "Movimiento actualizado" : `${labels[type]} añadido`);
      setLoading(false);
      if (keepOpenRef.current && !expense) {
        setFormKey((k) => k + 1);
        keepOpenRef.current = false;
      } else {
        if (!expense) formRef.current?.reset();
        onSuccess?.();
      }
    }
  }

  const typeButtons: { value: ExpenseType; label: string; activeClass: string }[] = [
    { value: "expense", label: "Gasto", activeClass: "bg-red-500 hover:bg-red-600 text-white" },
    { value: "income", label: "Ingreso", activeClass: "bg-emerald-500 hover:bg-emerald-600 text-white" },
    { value: "debt", label: "Deuda", activeClass: "bg-amber-500 hover:bg-amber-600 text-white" },
    ...(hasInvestments && !expense ? [{ value: "transfer" as ExpenseType, label: "Traspaso", activeClass: "bg-violet-500 hover:bg-violet-600 text-white" }] : []),
  ];

  const submitLabel = isTransfer ? "Añadir traspaso" : type === "income" ? "Añadir ingreso" : type === "debt" ? "Añadir deuda" : "Añadir gasto";

  return (
    <form key={formKey} ref={formRef} action={handleSubmit} className="grid gap-4 md:grid-cols-2 md:gap-x-5 md:gap-y-4">
      <div className="flex flex-wrap gap-2 md:col-span-2">
        {typeButtons.map((btn) => (
          <Button
            key={btn.value}
            type="button"
            variant={type === btn.value ? "default" : "outline"}
            size="sm"
            onClick={() => setType(btn.value)}
            className={type === btn.value ? btn.activeClass : ""}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {showPaymentMethod && (
        <div className="flex gap-2 md:col-span-2">
          <Button
            type="button"
            variant={paymentMethod === "bank" ? "default" : "outline"}
            size="sm"
            onClick={() => setPaymentMethod("bank")}
            className={paymentMethod === "bank" ? "bg-sky-500 hover:bg-sky-600 text-white" : ""}
          >
            🏦 Banco
          </Button>
          <Button
            type="button"
            variant={paymentMethod === "cash" ? "default" : "outline"}
            size="sm"
            onClick={() => setPaymentMethod("cash")}
            className={paymentMethod === "cash" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            💵 Efectivo
          </Button>
        </div>
      )}

      {isTransfer && (
        <div className="grid grid-cols-2 gap-2 md:col-span-2">
          <Button
            type="button"
            variant={transferDirection === "bank_to_cash" ? "default" : "outline"}
            size="sm"
            onClick={() => setTransferDirection("bank_to_cash")}
            className={cn(transferDirection === "bank_to_cash" ? "bg-violet-500 hover:bg-violet-600 text-white" : "", "h-auto whitespace-normal py-2")}
          >
            🏦 → 💵 Banco a Efectivo
          </Button>
          <Button
            type="button"
            variant={transferDirection === "cash_to_bank" ? "default" : "outline"}
            size="sm"
            onClick={() => setTransferDirection("cash_to_bank")}
            className={cn(transferDirection === "cash_to_bank" ? "bg-violet-500 hover:bg-violet-600 text-white" : "", "h-auto whitespace-normal py-2")}
          >
            💵 → 🏦 Efectivo a Banco
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:col-span-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Importe (EUR)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="any"
            min="0.000000001"
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
          placeholder={type === "debt" ? "Ej: Pedro me debe cena" : "Ej: Compra supermercado"}
          onBlur={async (e) => {
            const val = e.target.value.trim();
            if (!val || expense || type !== "expense" || categoryManual.current) return;
            const result = await suggestCategory(val);
            if (result && !categoryManual.current) {
              const select = formRef.current?.querySelector<HTMLSelectElement>("#category_id");
              if (select && !select.value) {
                select.value = result.category_id;
                setSuggestedCat(result.category_name);
              }
            }
          }}
        />
      </div>

      {showCategory && (
        <div className="space-y-2 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <Label htmlFor="category_id">Categoría</Label>
            <QuickCategoryButton />
          </div>
          <select
            id="category_id"
            name="category_id"
            defaultValue={expense?.category_id || (categories.length === 1 ? categories[0].id : "")}
            required
            onChange={() => { categoryManual.current = true; setSuggestedCat(null); }}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Selecciona categoría
            </option>
            {categories
              .filter((cat) => {
                const n = cat.name.toLowerCase();
                return n !== "ingreso" && n !== "deuda";
              })
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
          </select>
          {suggestedCat && (
            <p className="text-[11px] text-primary">Sugerido: {suggestedCat}</p>
          )}
        </div>
      )}

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

      {expense ? (
        <Button type="submit" className="w-full md:col-span-2" disabled={loading}>
          {loading ? "Guardando..." : "Actualizar"}
        </Button>
      ) : (
        <div className="flex gap-2 md:col-span-2">
          <Button
            type="submit"
            variant="outline"
            className="flex-1"
            disabled={loading}
            onClick={() => { keepOpenRef.current = true; }}
          >
            {loading ? "Guardando..." : "Guardar y crear otro"}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={loading}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
