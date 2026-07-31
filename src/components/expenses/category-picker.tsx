"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QuickCategoryButton } from "@/components/expenses/quick-category";
import { cn } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-react";
import type { Category } from "@/types";

type Props = {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  /** Field name for the hidden input submitted with the form. */
  name?: string;
  id?: string;
};

/**
 * Category selector: a trigger showing the current pick, backed by a sheet with
 * an icon grid. Replaces a native `<select>`, which cannot render the icons.
 */
export function CategoryPicker({ categories, value, onChange, name = "category_id", id = "category_id" }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const selected = categories.find((c) => c.id === value);
  const filtered = filter
    ? categories.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : categories;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setFilter("");
  }

  return (
    <>
      <input type="hidden" name={name} value={value} />

      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center gap-2.5 rounded-md border border-input bg-transparent px-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-10"
      >
        {selected ? (
          <>
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base"
              style={{ backgroundColor: (selected.color || "#64748b") + "18" }}
            >
              {selected.icon || "📦"}
            </span>
            <span className="min-w-0 flex-1 truncate text-base md:text-sm">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-base text-muted-foreground md:text-sm">
            Selecciona categoría
          </span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent variant="sheet" className="sm:max-w-md" initialFocus={false}>
          <DialogHeader variant="bar">
            <DialogTitle>Elige categoría</DialogTitle>
          </DialogHeader>

          {categories.length > 8 && (
            <div className="relative shrink-0 px-5 pt-4">
              <Search className="absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar categorías..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <DialogBody>
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No se encontraron categorías
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {filtered.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onChange(cat.id);
                      handleOpenChange(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border border-border/70 px-2 py-3 text-center transition-colors",
                      cat.id === value
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                      style={{ backgroundColor: (cat.color || "#64748b") + "18" }}
                    >
                      {cat.icon || "📦"}
                    </span>
                    <span className="w-full truncate text-xs font-medium leading-snug">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </DialogBody>

          <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
            <QuickCategoryButton appearance="button" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
