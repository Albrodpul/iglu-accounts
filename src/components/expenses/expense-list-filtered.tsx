"use client";

import { useState, useTransition } from "react";
import { ExpenseList } from "./expense-list";
import { matchesSearch } from "@/lib/amount-search";
import { breakdownByCategory, summarizeMovements } from "@/lib/filter-summary";
import { CategoryBreakdown, MovementsLayout } from "./category-breakdown";
import { MovementFilters } from "./movement-filters";
import type { Category, ExpenseWithCategory } from "@/types";

type Props = {
  /** What the list covers, shown on the breakdown panel (e.g. "Septiembre 2026"). */
  periodLabel: string;
  expenses: ExpenseWithCategory[];
  categories: Category[];
  initialCategoryFilter?: string;
  hasInvestments?: boolean;
  debtCategoryId?: string | null;
  transferCategoryId?: string | null;
};

export function ExpenseListFiltered({ periodLabel, expenses, categories, initialCategoryFilter = "", hasInvestments = false, debtCategoryId = null, transferCategoryId = null }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter);
  const [conceptFilter, setConceptFilter] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selecting, setSelecting] = useState(false);

  const searched = expenses.filter((e) => matchesSearch(e, conceptFilter));
  const filtered = categoryFilter ? searched.filter((e) => e.category_id === categoryFilter) : searched;
  const totalsOptions = { categoryId: categoryFilter, debtCategoryId, transferCategoryId };
  const selectCategory = (id: string) => startTransition(() => setCategoryFilter(id));

  const usedCategories = categories.filter((cat) =>
    expenses.some((e) => e.category_id === cat.id)
  );

  const hasFilters = categoryFilter || conceptFilter;

  return (
    <MovementsLayout
      aside={
        <CategoryBreakdown
          // Before the category filter, so the other categories stay there to switch to.
          entries={breakdownByCategory(searched, totalsOptions)}
          categories={categories}
          selectedId={categoryFilter}
          onSelect={selectCategory}
          caption={conceptFilter ? `${periodLabel} · «${conceptFilter}»` : periodLabel}
        />
      }
    >
      <MovementFilters
        search={conceptFilter}
        onSearchChange={(value) => startTransition(() => setConceptFilter(value))}
        categoryId={categoryFilter}
        onCategoryChange={selectCategory}
        sortAsc={sortAsc}
        onSortChange={(ascending) => startTransition(() => setSortAsc(ascending))}
        categories={usedCategories}
        manageCategories={categories}
        loading={isPending}
        summary={summarizeMovements(filtered, totalsOptions)}
        onSelect={() => setSelecting(true)}
      />

      <div className={isPending ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
        <ExpenseList
          stickyDayHeaders
          gestureHint
          backToStart
          collapseFuture={!hasFilters}
          expenses={filtered}
          categories={categories}
          sortable={false}
          externalSortAsc={sortAsc}
          hasInvestments={hasInvestments}
          debtCategoryId={debtCategoryId}
          transferCategoryId={transferCategoryId}
          selecting={selecting}
          onSelectingChange={setSelecting}
        />
      </div>
    </MovementsLayout>
  );
}
