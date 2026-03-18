"use client";

import { useState } from "react";
import { ExpenseList } from "./expense-list";
import { Search, X } from "lucide-react";
import type { Category, ExpenseWithCategory } from "@/types";

type Props = {
  expenses: ExpenseWithCategory[];
  categories: Category[];
  initialCategoryFilter?: string;
  hasInvestments?: boolean;
};

export function ExpenseListFiltered({ expenses, categories, initialCategoryFilter = "", hasInvestments = false }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter);
  const [conceptFilter, setConceptFilter] = useState("");

  const filtered = expenses.filter((e) => {
    if (categoryFilter && e.category_id !== categoryFilter) return false;
    if (conceptFilter && !e.concept?.toLowerCase().includes(conceptFilter.toLowerCase())) return false;
    return true;
  });

  const usedCategories = categories.filter((cat) =>
    expenses.some((e) => e.category_id === cat.id)
  );

  const hasFilters = categoryFilter || conceptFilter;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar concepto..."
            value={conceptFilter}
            onChange={(e) => setConceptFilter(e.target.value)}
            className="h-9 w-full rounded-lg border border-border/70 bg-transparent pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-lg border border-border/70 bg-transparent px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
        >
          <option value="">Todas las categorías</option>
          {usedCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setCategoryFilter(""); setConceptFilter(""); }}
            className="flex h-9 items-center gap-1 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      <ExpenseList expenses={filtered} categories={categories} hasInvestments={hasInvestments} />
    </>
  );
}
