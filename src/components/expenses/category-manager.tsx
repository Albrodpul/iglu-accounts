"use client";

import { useState } from "react";
import { deleteCategory } from "@/actions/categories";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryForm } from "@/components/settings/category-form";
import { Plus, Trash2, Settings2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types";

type Props = {
  categories: Category[];
};

export function CategoryManager({ categories }: Props) {
  const [listOpen, setListOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filter, setFilter] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  function openCreate() {
    setEditingCategory(null);
    setFormOpen(true);
    setListOpen(false);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setFormOpen(true);
    setListOpen(false);
  }

  async function handleDelete(cat: Category) {
    const ok = await confirm({
      title: "Eliminar categoría",
      description: `¿Eliminar "${cat.name}"? No se podrá si tiene gastos asociados.`,
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (ok) {
      const result = await deleteCategory(cat.id);
      if (result?.error) {
        toast.error("No se puede eliminar: " + result.error);
      } else {
        toast.success("Categoría eliminada");
      }
    }
  }

  const filtered = filter
    ? categories.filter((cat) =>
        cat.name.toLowerCase().includes(filter.toLowerCase())
      )
    : categories;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setListOpen(true)}>
        <Settings2 className="h-4 w-4 mr-1" /> Categorías
      </Button>

      {/* Category list dialog */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent variant="sheet" className="sm:max-w-md">
          <DialogHeader variant="bar">
            <DialogTitle>Categorías</DialogTitle>
          </DialogHeader>
          {categories.length > 8 && (
            <div className="shrink-0 px-5 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrar categorías..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          <DialogBody>
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {filter ? "No se encontraron categorías" : "No hay categorías. Crea una para empezar."}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {filtered.map((cat) => (
                  <div key={cat.id} className="relative">
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-border/70 px-2 py-3 text-center transition-colors hover:bg-muted/40"
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
                    <button
                      type="button"
                      aria-label={`Eliminar ${cat.name}`}
                      onClick={() => handleDelete(cat)}
                      className="absolute top-1 right-1 rounded p-1 text-muted-foreground/60 transition-colors hover:text-expense"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </DialogBody>
          <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
            <Button onClick={openCreate} className="h-12 w-full md:h-10">
              <Plus className="h-4 w-4 mr-1" /> Añadir categoría
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit category dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingCategory(null); }}>
        <DialogContent variant="sheet" className="sm:max-w-md">
          <DialogHeader variant="bar">
            <DialogTitle>{editingCategory ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <CategoryForm
              key={editingCategory?.id ?? "new"}
              category={editingCategory ?? undefined}
              onSuccess={() => {
                setFormOpen(false);
                setEditingCategory(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
