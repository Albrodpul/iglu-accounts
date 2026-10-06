"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteExpense, searchExpenses } from "@/actions/expenses";
import { MovementDialog } from "./movement-dialog";
import { formatDate } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import type { Category, ExpenseWithCategory } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Needed to edit a result in place. */
  categories?: Category[];
  hasInvestments?: boolean;
  debtCategoryId?: string | null;
  transferCategoryId?: string | null;
};

export function GlobalSearch({ open, onOpenChange, categories = [], hasInvestments = false, debtCategoryId = null, transferCategoryId = null }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<ExpenseWithCategory | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExpenseWithCategory[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const data = await searchExpenses(value);
        setResults(data);
        setSearched(true);
      });
    }, 300);
  }

  /** After editing or deleting a result: reflect it here and on the page behind. */
  function refreshAfterChange() {
    setEditing(null);
    router.refresh();
    const current = query;
    if (!current.trim()) return;
    startTransition(async () => {
      setResults(await searchExpenses(current));
    });
  }

  async function handleDelete(expense: ExpenseWithCategory) {
    setEditing(null);
    const result = await deleteExpense(expense.id);
    if (result?.error) toast.error(result.error);
    else toast.success("Movimiento eliminado");
    refreshAfterChange();
  }

  function handleClose(v: boolean) {
    if (!v) {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
    onOpenChange(v);
  }

  function amountColor(expense: ExpenseWithCategory) {
    if (transferCategoryId && expense.category_id === transferCategoryId) return "text-transfer";
    if (debtCategoryId && expense.category_id === debtCategoryId) return "text-debt";
    return expense.amount >= 0 ? "text-income" : "text-foreground";
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent variant="sheet" className="sm:max-w-lg">
        <DialogHeader variant="bar">
          <DialogTitle>Buscar movimientos</DialogTitle>
        </DialogHeader>

        <div className="shrink-0 px-5 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Concepto o importe"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              autoFocus
              className="h-12 w-full rounded-lg border border-border/70 bg-transparent pl-10 pr-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring md:h-10 md:text-sm"
            />
          </div>
        </div>

        <DialogBody className="px-5 pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {isPending && (
            <p className="py-6 text-center text-sm text-muted-foreground">Buscando...</p>
          )}

          {!isPending && searched && results.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron resultados para &quot;{query}&quot;
            </p>
          )}

          {!isPending && results.length > 0 && (
            <div className="space-y-1">
              {results.map((expense) => (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => setEditing(expense)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/35"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: (expense.category?.color || "#64748b") + "15" }}
                  >
                    {expense.category?.icon || "📦"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground break-words">
                      {expense.concept}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {expense.category?.name} · {formatDate(expense.expense_date)}
                    </p>
                  </div>

                  <span className={`text-sm font-semibold tabular-nums shrink-0 ${amountColor(expense)}`}>
                    <Amount value={expense.amount} />
                  </span>
                </button>
              ))}

              {results.length === 50 && (
                <p className="pt-2 text-center text-xs text-muted-foreground">
                  Mostrando los 50 resultados más recientes
                </p>
              )}
            </div>
          )}

          {!isPending && !searched && (
            <p className="py-6 text-center text-sm text-muted-foreground">
Busca en todo el historial por concepto o por importe. Toca un resultado para editarlo.
            </p>
          )}
        </DialogBody>
      </DialogContent>

      {editing && (
        <MovementDialog
          open
          onOpenChange={() => setEditing(null)}
          categories={categories}
          expense={editing}
          hasInvestments={hasInvestments}
          onSuccess={refreshAfterChange}
          onDelete={() => handleDelete(editing)}
        />
      )}
    </Dialog>
  );
}
