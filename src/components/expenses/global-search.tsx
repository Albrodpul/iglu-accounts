"use client";

import { useState, useRef, useTransition } from "react";
import { searchExpenses } from "@/actions/expenses";
import { formatDate } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import type { ExpenseWithCategory } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtCategoryId?: string | null;
  transferCategoryId?: string | null;
};

export function GlobalSearch({ open, onOpenChange, debtCategoryId = null, transferCategoryId = null }: Props) {
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

  function handleClose(v: boolean) {
    if (!v) {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
    onOpenChange(v);
  }

  function amountColor(expense: ExpenseWithCategory) {
    if (transferCategoryId && expense.category_id === transferCategoryId) return "text-violet-400";
    if (debtCategoryId && expense.category_id === debtCategoryId) return "text-sky-400";
    return expense.amount >= 0 ? "text-income" : "text-foreground";
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
          <DialogTitle>Buscar movimientos</DialogTitle>
        </DialogHeader>

        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar en todo el historial..."
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              autoFocus
              className="h-10 w-full rounded-lg border border-border/70 bg-transparent pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 pb-5">
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
                <div
                  key={expense.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/35"
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
                </div>
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
              Escribe para buscar en todo el historial
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
