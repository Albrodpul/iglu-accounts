"use client";

import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/utils";
import type { CategoryTotal } from "@/lib/filter-summary";
import type { Category } from "@/types";

type Props = {
  /** Totals per category of what the list is showing (before the category filter). */
  entries: CategoryTotal[] | null;
  categories: Category[];
  selectedId: string;
  /** Called with the category id, or "" to clear the filter. */
  onSelect: (categoryId: string) => void;
  /** What the breakdown covers, e.g. "Septiembre 2026". */
  caption: string;
};

/**
 * Side panel of the movements screen on wide viewports: where the money went,
 * by category. Each row filters the list; tapping the active one clears it.
 */
export function CategoryBreakdown({ entries, categories, selectedId, onSelect, caption }: Props) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const groups = [
    { title: "Gastos", items: (entries ?? []).filter((e) => e.total < 0) },
    { title: "Ingresos", items: (entries ?? []).filter((e) => e.total >= 0) },
  ].filter((group) => group.items.length > 0);

  return (
    <aside
      aria-label="Desglose por categoría"
      // Bottom padding lets the last rows scroll clear of the floating "+" button.
      className="surface-card sticky top-20 hidden max-h-[calc(100vh-6.5rem)] overflow-y-auto p-5 pb-24 lg:block"
    >
      <h2 className="text-base font-bold">Por categoría</h2>
      <p className="text-xs text-muted-foreground">{caption}</p>

      {entries === null ? (
        <div className="mt-4 space-y-3" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No hay movimientos que desglosar.</p>
      ) : (
        groups.map((group) => {
          const max = Math.max(...group.items.map((e) => Math.abs(e.total)));
          return (
            <section key={group.title} className="mt-4">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h3>
              <ul className="space-y-0.5">
                {group.items.map((entry) => {
                  const category = byId.get(entry.categoryId);
                  const selected = entry.categoryId === selectedId;
                  return (
                    <li key={entry.categoryId}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelect(selected ? "" : entry.categoryId)}
                        title={selected ? "Quitar filtro" : `Ver solo ${category?.name ?? "esta categoría"}`}
                        className={cn(
                          "w-full cursor-pointer rounded-lg px-2 py-1.5 text-left transition-colors",
                          selected ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/50"
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <span aria-hidden className="shrink-0">{category?.icon || "📦"}</span>
                          <span className="min-w-0 flex-1 truncate">{category?.name ?? "Sin categoría"}</span>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{entry.count}</span>
                          <span className={cn("shrink-0 font-semibold tabular-nums", entry.total >= 0 && "text-income")}>
                            <Amount value={entry.total} />
                          </span>
                        </span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${max > 0 ? Math.max(3, (Math.abs(entry.total) / max) * 100) : 0}%`,
                              backgroundColor: category?.color || "#64748b",
                            }}
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </aside>
  );
}

/** List panel + (on wide viewports) the breakdown beside it. */
export function MovementsLayout({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-8">
      <div className="glass-panel p-5 md:p-6">{children}</div>
      {aside}
    </div>
  );
}
