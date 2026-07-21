"use client";

import { useState } from "react";
import { createCategory, updateCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { toast } from "sonner";
import type { Category } from "@/types";

type Props = {
  category?: Category;
  onSuccess?: () => void;
};

export function CategoryForm({ category, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState(category?.icon || "");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    if (selectedIcon) formData.set("icon", selectedIcon);

    const result = category
      ? await updateCategory(category.id, formData)
      : await createCategory(formData);

    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success(category ? "Categoría actualizada" : "Categoría creada");
      setSelectedIcon("");
      onSuccess?.();
    }
    setLoading(false);
  }

  return (
    <form
      action={handleSubmit}
      onSubmit={(e) => e.stopPropagation()}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
      <div className="space-y-2">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input
          id="cat-name"
          name="name"
          defaultValue={category?.name || ""}
          placeholder="Ej: Mascotas"
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label>Icono</Label>
          <EmojiPicker value={selectedIcon} onChange={setSelectedIcon} />
          <input type="hidden" name="icon" value={selectedIcon} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-color">Color</Label>
          <Input
            id="cat-color"
            name="color"
            type="color"
            defaultValue={category?.color || "#64748b"}
          />
        </div>
      </div>
      <input type="hidden" name="sort_order" value={category?.sort_order ?? 99} />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </p>
      )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
        <Button type="submit" className="h-12 w-full md:h-10" disabled={loading}>
          {loading ? "Guardando..." : category ? "Actualizar" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
