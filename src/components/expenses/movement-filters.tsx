"use client";

import { useState } from "react";
import { ArrowUpDown, LayoutGrid, ListChecks, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/ui/amount";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CategoryTile } from "@/components/expenses/category-picker";
import { CategoryManager } from "@/components/expenses/category-manager";
import { cn } from "@/lib/utils";
import type { FilterSummary } from "@/lib/filter-summary";
import type { Category } from "@/types";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  sortAsc: boolean;
  onSortChange: (ascending: boolean) => void;
  /** Categories offered as a filter. */
  categories: Category[];
  /** Every category of the account: enables the "manage categories" shortcut. */
  manageCategories?: Category[];
  loading?: boolean;
  /** Count and total of the matches; shown while a search or category filter is active. */
  summary?: FilterSummary | null;
  /** Starts selecting several movements; shows the entry points when given. */
  onSelect?: () => void;
};

const chipClass =
  "flex h-8 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 pl-3 pr-2 text-xs font-medium text-foreground";

/**
 * Search + filters of the movement lists. One row on every width: on phones the
 * category and order live in a bottom sheet behind a single button (so the list
 * starts higher), and active filters show up as removable chips; from `sm` up
 * they stay inline as plain controls.
 */
export function MovementFilters({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  sortAsc,
  onSortChange,
  categories,
  manageCategories,
  loading = false,
  summary,
  onSelect,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const hasFilters = Boolean(search || categoryId);
  const sheetFilters = (categoryId ? 1 : 0) + (sortAsc ? 1 : 0);
  const SearchIcon = loading ? Loader2 : Search;

  return (
    <div className="mb-4 space-y-2">
      {/* From `sm` up the controls wrap rather than squeeze the search box. */}
      <div className="flex items-center gap-2 sm:flex-wrap">
        <div className="relative min-w-0 flex-1 sm:min-w-64">
          <SearchIcon
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:h-3.5 sm:w-3.5",
              loading && "animate-spin"
            )}
          />
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Buscar concepto o importe"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            // 16px on phones: anything smaller makes iOS zoom the page on focus.
            className="h-10 w-full rounded-lg border border-border/70 bg-transparent pl-9 pr-9 text-base outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring sm:h-9 sm:text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Borrar búsqueda"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Phones: everything else sits behind one button. */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={sheetFilters > 0 ? `Filtros (${sheetFilters} activos)` : "Filtros"}
          className={cn(
            "relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors sm:hidden",
            sheetFilters > 0
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {sheetFilters > 0 && (
            <span
              aria-hidden
              className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
            >
              {sheetFilters}
            </span>
          )}
        </button>

        {/* From `sm` up: inline controls. */}
        <select
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="Categoría"
          className="hidden h-9 rounded-lg border border-border/70 bg-transparent px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring sm:block"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onSortChange(!sortAsc)}
          title={sortAsc ? "Orden: más antiguo primero" : "Orden: más reciente primero"}
          className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground sm:flex"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortAsc ? "Más antiguo" : "Más reciente"}
        </button>
        {onSelect && (
          <button
            type="button"
            onClick={onSelect}
            title="Seleccionar varios movimientos para cambiarles la categoría o eliminarlos"
            className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground sm:flex"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Seleccionar
          </button>
        )}
      </div>

      {/* Phones: what is narrowing or reordering the list, one tap to undo. */}
      {(selectedCategory || sortAsc) && (
        <div className="flex flex-wrap gap-1.5 sm:hidden">
          {selectedCategory && (
            <span className={chipClass}>
              <span aria-hidden>{selectedCategory.icon || "📦"}</span>
              {selectedCategory.name}
              <button
                type="button"
                onClick={() => onCategoryChange("")}
                aria-label={`Quitar filtro ${selectedCategory.name}`}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {sortAsc && (
            <span className={chipClass}>
              Más antiguo primero
              <button
                type="button"
                onClick={() => onSortChange(false)}
                aria-label="Volver a más reciente primero"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
      )}

      {hasFilters && (
        <div className="flex min-h-5 items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
          <p aria-live="polite">
            {summary && (
              <>
                <span className="font-semibold text-foreground">
                  {summary.count} {summary.count === 1 ? "movimiento" : "movimientos"}
                </span>
                {summary.count > 0 && (
                  <>
                    {" · "}
                    <span className={cn("font-semibold tabular-nums", summary.total >= 0 ? "text-income" : "text-expense")}>
                      <Amount value={summary.total} />
                    </span>
                  </>
                )}
              </>
            )}
          </p>
          {/* Phones clear filters from their chips. */}
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onCategoryChange("");
            }}
            className="hidden cursor-pointer items-center gap-1 font-medium hover:text-foreground sm:flex"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        </div>
      )}

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent variant="sheet" className="sm:max-w-md" initialFocus={false}>
          <DialogHeader variant="bar">
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Orden</h3>
              <SegmentedControl
                aria-label="Orden"
                value={sortAsc ? "asc" : "desc"}
                onChange={(value) => onSortChange(value === "asc")}
                options={[
                  { value: "desc", label: "Más reciente" },
                  { value: "asc", label: "Más antiguo" },
                ]}
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Categoría</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                <CategoryTile
                  name="Todas"
                  icon={<LayoutGrid className="h-5 w-5 text-muted-foreground" />}
                  selected={!categoryId}
                  onClick={() => {
                    onCategoryChange("");
                    setSheetOpen(false);
                  }}
                />
                {categories.map((cat) => (
                  <CategoryTile
                    key={cat.id}
                    name={cat.name}
                    icon={cat.icon || "📦"}
                    color={cat.color}
                    selected={cat.id === categoryId}
                    onClick={() => {
                      onCategoryChange(cat.id);
                      setSheetOpen(false);
                    }}
                  />
                ))}
              </div>
            </section>
          </DialogBody>

          <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
            {onSelect && (
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  onSelect();
                }}
                className="flex h-10 cursor-pointer items-center justify-center gap-2 text-sm font-medium text-primary"
              >
                <ListChecks className="h-4 w-4" />
                Seleccionar varios movimientos
              </button>
            )}
            {manageCategories && <CategoryManager categories={manageCategories} trigger="link" />}
            <Button onClick={() => setSheetOpen(false)} className="h-12 w-full md:h-10">
              Listo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
