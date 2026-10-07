"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getExpensesPaginated, getFilteredOverview } from "@/actions/expenses";
import { CategoryBreakdown, MovementsLayout } from "./category-breakdown";
import { useMediaQuery } from "@/hooks/use-browser-state";
import { MovementFilters } from "./movement-filters";
import type { CategoryTotal, FilterSummary } from "@/lib/filter-summary";
import { ExpenseList } from "./expense-list";
import type { Category, ExpenseWithCategory } from "@/types";

const PAGE_SIZE = 50;

type Props = {
  initialExpenses: ExpenseWithCategory[];
  initialHasMore: boolean;
  /** Category the initial page was already filtered by (from `?category=`). */
  initialCategoryFilter?: string;
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
  initialCategoryFilter = "",
  categories,
  debtCategoryId,
  transferCategoryId,
  hasInvestments,
}: Props) {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>(initialExpenses);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextPage, setNextPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
  const [sortAsc, setSortAsc] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Bumped to force a refetch with the current filters (after a mutation).
  const [reloadToken, setReloadToken] = useState(0);

  // A fresh server render (router.refresh) hands us new initialExpenses:
  // refetch with the active filters. Adjusting state during render avoids an
  // effect that would only exist to copy a prop into state.
  const [prevInitial, setPrevInitial] = useState(initialExpenses);
  if (prevInitial !== initialExpenses) {
    setPrevInitial(initialExpenses);
    setReloadToken((t) => t + 1);
  }

  // The list is "loading" while the data on screen belongs to another query.
  const queryKey = JSON.stringify([debouncedSearch, categoryFilter, sortAsc, reloadToken]);
  const [loadedKey, setLoadedKey] = useState(queryKey);
  const filterLoading = loadedKey !== queryKey;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (queryKey === loadedKey) return;
    // Ignore responses for a query the user has already moved past.
    let cancelled = false;
    getExpensesPaginated({
      page: 0,
      limit: PAGE_SIZE,
      ascending: sortAsc,
      search: debouncedSearch || undefined,
      categoryId: categoryFilter || undefined,
    })
      .then((result) => {
        if (cancelled) return;
        setExpenses(result.data as ExpenseWithCategory[]);
        setHasMore(result.hasMore);
        setNextPage(1);
        setLoadedKey(queryKey);
      })
      .catch(() => {
        if (!cancelled) setLoadedKey(queryKey);
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey, loadedKey, sortAsc, debouncedSearch, categoryFilter]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || filterLoading) return;
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
  }, [loading, hasMore, filterLoading, nextPage, sortAsc, debouncedSearch, categoryFilter]);

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

  const hasFilters = Boolean(debouncedSearch || categoryFilter);

  // Totals of *all* matches (the list only holds the pages loaded so far). The
  // side panel needs them even unfiltered, but it only exists on wide viewports:
  // phones don't pay for reading the whole history just to hide it.
  const showsBreakdown = useMediaQuery("(min-width: 1024px)");
  const needsOverview = hasFilters || showsBreakdown;
  const overviewKey = JSON.stringify([debouncedSearch, categoryFilter, reloadToken]);
  const [overview, setOverview] = useState<{
    key: string;
    summary: FilterSummary;
    breakdown: CategoryTotal[];
  } | null>(null);
  useEffect(() => {
    if (!needsOverview) return;
    let cancelled = false;
    getFilteredOverview({ search: debouncedSearch || undefined, categoryId: categoryFilter || undefined })
      .then((value) => {
        if (!cancelled) setOverview({ key: overviewKey, ...value });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [needsOverview, overviewKey, debouncedSearch, categoryFilter]);
  const currentOverview = overview?.key === overviewKey ? overview : null;

  return (
    <MovementsLayout
      aside={
        <CategoryBreakdown
          // Keep the previous rows on screen while the next ones load.
          entries={currentOverview?.breakdown ?? overview?.breakdown ?? null}
          categories={categories}
          selectedId={categoryFilter}
          onSelect={setCategoryFilter}
          caption={debouncedSearch ? `Resultados de «${debouncedSearch}»` : "Todo el histórico"}
        />
      }
    >
      <MovementFilters
        search={search}
        onSearchChange={setSearch}
        categoryId={categoryFilter}
        onCategoryChange={setCategoryFilter}
        sortAsc={sortAsc}
        onSortChange={setSortAsc}
        categories={categories}
        manageCategories={categories}
        loading={filterLoading}
        summary={currentOverview?.summary ?? null}
        onSelect={() => setSelecting(true)}
      />

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
            stickyDayHeaders
            gestureHint
            backToStart
            // While searching, every match should be visible straight away.
            collapseFuture={!hasFilters}
            expenses={expenses}
            categories={categories}
            sortable={false}
            externalSortAsc={sortAsc}
            showYear
            hasInvestments={hasInvestments}
            debtCategoryId={debtCategoryId}
            transferCategoryId={transferCategoryId}
            onMutated={() => setReloadToken((t) => t + 1)}
            selecting={selecting}
            onSelectingChange={setSelecting}
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
    </MovementsLayout>
  );
}
