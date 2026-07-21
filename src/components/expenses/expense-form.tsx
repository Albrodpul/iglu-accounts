"use client";

import { useState, useRef } from "react";
import { createExpense, updateExpense, createTransfer, updateTransfer, checkDuplicate, suggestCategory } from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuickCategoryButton } from "@/components/expenses/quick-category";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
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
  const cat = categories.find((c) => c.id === expense.category_id);
  if (cat?.name.toLowerCase() === "traspaso") return "transfer";
  if (expense.amount <= 0) return "expense";
  if (cat?.name.toLowerCase() === "deuda") return "debt";
  return "income";
}

function detectTransferDirection(expense: Expense | undefined): "bank_to_cash" | "cash_to_bank" {
  if (!expense) return "bank_to_cash";
  if (expense.amount < 0) return expense.payment_method === "bank" ? "bank_to_cash" : "cash_to_bank";
  return expense.payment_method === "bank" ? "cash_to_bank" : "bank_to_cash";
}

export function ExpenseForm({ categories, expense, onSuccess, hasInvestments = false }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<ExpenseType>(() => detectExpenseType(expense, categories));
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "cash">(expense?.payment_method || "bank");
  const [transferDirection, setTransferDirection] = useState<"bank_to_cash" | "cash_to_bank">(() => detectTransferDirection(expense));
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
      result = expense
        ? await updateTransfer(expense.id, formData)
        : await createTransfer(formData);
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

  const isExistingTransfer = expense
    ? categories.find((c) => c.id === expense.category_id)?.name.toLowerCase() === "traspaso"
    : false;

  const typeButtons: { value: ExpenseType; label: string; activeClass: string }[] = [
    { value: "expense", label: "Gasto", activeClass: "bg-red-500 hover:bg-red-600 text-white" },
    { value: "income", label: "Ingreso", activeClass: "bg-emerald-500 hover:bg-emerald-600 text-white" },
    { value: "debt", label: "Deuda", activeClass: "bg-amber-500 hover:bg-amber-600 text-white" },
    ...((hasInvestments && !expense) || isExistingTransfer ? [{ value: "transfer" as ExpenseType, label: "Traspaso", activeClass: "bg-violet-500 hover:bg-violet-600 text-white" }] : []),
  ];

  const submitLabel = isTransfer ? "Añadir traspaso" : type === "income" ? "Añadir ingreso" : type === "debt" ? "Añadir deuda" : "Añadir gasto";

  return (
    <form
      key={formKey}
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (loading) return;
        handleSubmit(new FormData(e.currentTarget));
      }}
      className={cn("flex min-h-0 flex-1 flex-col", loading && "pointer-events-none")}
    >
      <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto overscroll-contain px-5 py-4 md:grid-cols-2 md:gap-x-5 md:gap-y-4">
      <div
        className="grid gap-2 md:col-span-2"
        style={{ gridTemplateColumns: `repeat(${typeButtons.length}, minmax(0, 1fr))` }}
      >
        {typeButtons.map((btn) => (
          <Button
            key={btn.value}
            type="button"
            variant={type === btn.value ? "default" : "outline"}
            onClick={() => setType(btn.value)}
            className={cn("h-11 px-2 text-sm md:h-9", type === btn.value && btn.activeClass)}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {showPaymentMethod && (
        <div className="grid grid-cols-2 gap-2 md:col-span-2">
          <Button
            type="button"
            variant={paymentMethod === "bank" ? "default" : "outline"}
            onClick={() => setPaymentMethod("bank")}
            className={cn("h-11 md:h-9", paymentMethod === "bank" && "bg-sky-500 hover:bg-sky-600 text-white")}
          >
            🏦 Banco
          </Button>
          <Button
            type="button"
            variant={paymentMethod === "cash" ? "default" : "outline"}
            onClick={() => setPaymentMethod("cash")}
            className={cn("h-11 md:h-9", paymentMethod === "cash" && "bg-green-600 hover:bg-green-700 text-white")}
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
            onClick={() => setTransferDirection("bank_to_cash")}
            className={cn("h-auto min-h-11 whitespace-normal px-2 py-2 text-sm leading-tight", transferDirection === "bank_to_cash" && "bg-violet-500 hover:bg-violet-600 text-white")}
          >
            🏦 → 💵 Banco a Efectivo
          </Button>
          <Button
            type="button"
            variant={transferDirection === "cash_to_bank" ? "default" : "outline"}
            onClick={() => setTransferDirection("cash_to_bank")}
            className={cn("h-auto min-h-11 whitespace-normal px-2 py-2 text-sm leading-tight", transferDirection === "cash_to_bank" && "bg-violet-500 hover:bg-violet-600 text-white")}
          >
            💵 → 🏦 Efectivo a Banco
          </Button>
        </div>
      )}

      <div className="space-y-4 md:col-span-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Importe</Label>
          <AmountInput
            id="amount"
            name="amount"
            step="any"
            min="0.000000001"
            defaultValue={expense ? Math.abs(expense.amount) : ""}
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
          className="h-12 md:h-10"
          autoCapitalize="sentences"
          enterKeyHint="next"
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
            className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:text-sm"
          >
            <option value="" disabled>
              Selecciona categoría
            </option>
            {categories
              .filter((cat) => {
                const n = cat.name.toLowerCase();
                return n !== "ingreso" && n !== "deuda" && n !== "traspaso";
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
          className="min-h-20"
        />
      </div>

      {error && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-600 md:col-span-2">{error}</p>
      )}
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/70 bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:flex-row md:pb-4">
        {expense ? (
          <Button type="submit" className="h-12 w-full md:h-10" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Guardando..." : "Actualizar"}
          </Button>
        ) : (
          <>
            <Button
              type="submit"
              variant="outline"
              className="h-12 w-full md:h-10 md:flex-1"
              disabled={loading}
              onClick={() => { keepOpenRef.current = true; }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : "Guardar y crear otro"}
            </Button>
            <Button
              type="submit"
              className="h-12 w-full md:h-10 md:flex-1"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : submitLabel}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
