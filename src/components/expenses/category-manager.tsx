"use client";

import { useState } from "react";
import { deleteCategory } from "@/actions/categories";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryForm } from "@/components/settings/category-form";
import { Plus, Pencil, Trash2, Settings2, Search } from "lucide-react";
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
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>Categorías</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 space-y-4">
            {categories.length > 6 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrar categorías..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {filter ? "No se encontraron categorías" : "No hay categorías. Crea una para empezar."}
              </p>
            ) : (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {filtered.map((cat) => (
                  <div
                    key={cat.id}
                    className="group flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/35"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ backgroundColor: (cat.color || "#64748b") + "18" }}
                      >
                        {cat.icon || "📦"}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || "#64748b" }}
                        />
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      <button
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded text-muted-foreground hover:text-expense transition-colors cursor-pointer"
                        onClick={() => handleDelete(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button size="sm" onClick={openCreate} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Añadir categoría
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit category dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingCategory(null); }}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] max-h-[85vh] overflow-y-auto rounded-lg border border-border bg-card p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>{editingCategory ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4">
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
