"use client";

import { useState } from "react";
import { createCategory, deleteCategory } from "@/actions/categories";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Plus, Trash2 } from "lucide-react";
import type { Category } from "@/types";

type Props = {
  categories: Category[];
};

export function CategoryList({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string>("");
  const { confirm, ConfirmDialog } = useConfirm();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    if (selectedIcon) formData.set("icon", selectedIcon);
    const result = await createCategory(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setOpen(false);
      setSelectedIcon("");
    }
    setLoading(false);
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
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ej: Mascotas"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icono</Label>
                  <EmojiPicker value={selectedIcon} onChange={setSelectedIcon} />
                  <input type="hidden" name="icon" value={selectedIcon} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue="#64748b"
                  />
                </div>
              </div>
              <input type="hidden" name="sort_order" value="99" />
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color || "#64748b" }}
                />
                <span className="text-sm">
                  {cat.icon} {cat.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-700"
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
