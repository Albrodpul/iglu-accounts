"use client";

import { useState } from "react";
import { deleteCategory } from "@/actions/categories";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryForm } from "@/components/settings/category-form";
import { Plus, Trash2, Search } from "lucide-react";
import type { Category } from "@/types";

type Props = {
  categories: Category[];
};

export function CategoryList({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filter, setFilter] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  function openCreate() {
    setEditingCategory(null);
    setOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setOpen(true);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Eliminar categoría",
      description: "¿Eliminar esta categoría? No se podrá si tiene gastos asociados.",
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (ok) {
      const result = await deleteCategory(id);
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Categorías para clasificar tus gastos
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Añadir
        </Button>
      </div>

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

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditingCategory(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            key={editingCategory?.id ?? "new"}
            category={editingCategory ?? undefined}
            onSuccess={() => {
              setOpen(false);
              setEditingCategory(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {filtered.map((cat) => (
          <Card
            key={cat.id}
            className="group relative cursor-pointer transition-colors hover:bg-muted/40"
            onClick={() => openEdit(cat)}
          >
            <CardContent className="flex flex-col items-center gap-1.5 py-4 px-3 text-center">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: (cat.color || "#64748b") + "18" }}
              >
                {cat.icon || "📦"}
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || "#64748b" }}
                />
                <span className="text-sm font-medium leading-snug">
                  {cat.name}
                </span>
              </div>
            </CardContent>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1.5 right-1.5 h-6 w-6 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(cat.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </Card>
        ))}
      </div>

      {filter && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          No se encontraron categorías
        </p>
      )}

      {ConfirmDialog}
    </div>
  );
}
