"use client";

import { useState } from "react";
import { deleteCategory } from "@/actions/categories";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryForm } from "@/components/settings/category-form";
import { Plus, Trash2 } from "lucide-react";
import type { Category } from "@/types";

type Props = {
  categories: Category[];
};

export function CategoryList({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Categorías para clasificar tus gastos
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Añadir
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva categoría</DialogTitle>
            </DialogHeader>
            <CategoryForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center justify-between gap-2 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || "#64748b" }}
                />
                <span className="text-[15px] truncate">
                  {cat.icon} {cat.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700"
                onClick={() => handleDelete(cat.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {ConfirmDialog}
    </div>
  );
}
