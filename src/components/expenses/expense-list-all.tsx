"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getExpensesPaginated } from "@/actions/expenses";
import { ExpenseList } from "./expense-list";
import { Search, X, ArrowUpDown, Loader2 } from "lucide-react";
import type { Category, ExpenseWithCategory } from "@/types";

const PAGE_SIZE = 50;

type Props = {
  initialExpenses: ExpenseWithCategory[];
  initialHasMore: boolean;
  categories: Category[];
  debtCategoryId?: string | null;
  transferCategoryId?: string | null;
  hasInvestments?: boolean;
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-2 py-2.5">
      <div className="w-10 h-10 rounded-xl bg-muted/50 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-muted/50 animate-pulse rounded w-2/5" />
        <div className="h-3 bg-muted/40 animate-pulse rounded w-1/4" />
      </div>
      <div className="h-4 w-14 bg-muted/50 animate-pulse rounded" />
    </div>
  );
}

export function ExpenseListAll({
  initialExpenses,
  initialHasMore,
  categories,
  debtCategoryId,
  transferCategoryId,
  hasInvestments,
}: Props) {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>(initialExpenses);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextPage, setNextPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevFiltersRef = useRef({ debouncedSearch: "", categoryFilter: "", sortAsc: false });

  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed =
      prev.debouncedSearch !== debouncedSearch ||
      prev.categoryFilter !== categoryFilter ||
      prev.sortAsc !== sortAsc;
    prevFiltersRef.current = { debouncedSearch, categoryFilter, sortAsc };
    if (!changed) return;

    setFilterLoading(true);

    getExpensesPaginated({
      page: 0,
      limit: PAGE_SIZE,
      ascending: sortAsc,
      search: debouncedSearch || undefined,
      categoryId: categoryFilter || undefined,
    }).then((result) => {
      setExpenses(result.data as ExpenseWithCategory[]);
      setHasMore(result.hasMore);
      setNextPage(1);
      setFilterLoading(false);
    });
  }, [debouncedSearch, categoryFilter, sortAsc]);

  const reload = useCallback(async () => {
    setFilterLoading(true);
    const result = await getExpensesPaginated({
      page: 0,
      limit: PAGE_SIZE,
      ascending: sortAsc,
      search: debouncedSearch || undefined,
      categoryId: categoryFilter || undefined,
    });
    setExpenses(result.data as ExpenseWithCategory[]);
    setHasMore(result.hasMore);
    setNextPage(1);
    setFilterLoading(false);
  }, [sortAsc, debouncedSearch, categoryFilter]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const result = await getExpensesPaginated({
      page: nextPage,
      limit: PAGE_SIZE,
      ascending: sortAsc,
      search: debouncedSearch || undefined,
      categoryId: categoryFilter || undefined,
    });
    setExpenses((prev) => [...prev, ...(result.data as ExpenseWithCategory[])]);
    setHasMore(result.hasMore);
    setNextPage((p) => p + 1);
    setLoading(false);
  }, [loading, hasMore, nextPage, sortAsc, debouncedSearch, categoryFilter]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    reload();
  }, [initialExpenses]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const hasFilters = search || categoryFilter;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          {filterLoading ? (
            <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          )}
          <input
            type="text"
            placeholder="Buscar concepto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border/70 bg-transparent pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-lg border border-border/70 bg-transparent px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortAsc((s) => !s)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground cursor-pointer"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortAsc ? "Más antiguo primero" : "Más reciente primero"}
        </button>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setCategoryFilter(""); }}
            className="flex h-9 items-center gap-1 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {loading && expenses.length === 0 ? (
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className={filterLoading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
          <ExpenseList
            expenses={expenses}
            categories={categories}
            sortable={false}
            externalSortAsc={sortAsc}
            showYear
            hasInvestments={hasInvestments}
            debtCategoryId={debtCategoryId}
            transferCategoryId={transferCategoryId}
            onMutated={reload}
          />

          </div>
          <div ref={sentinelRef} className="h-1" />

          {loading && (
            <div className="space-y-0 mt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          )}

          {!hasMore && expenses.length > 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {expenses.length} movimientos
            </p>
          )}
        </>
      )}
    </>
  );
}
