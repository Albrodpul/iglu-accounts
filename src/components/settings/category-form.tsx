"use client";

import { useState } from "react";
import { createCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { toast } from "sonner";

type Props = {
  onSuccess?: () => void;
};

export function CategoryForm({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    if (selectedIcon) formData.set("icon", selectedIcon);
    const result = await createCategory(formData);
    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success("Categoría creada");
      setSelectedIcon("");
      onSuccess?.();
    }
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input
          id="cat-name"
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
          <Label htmlFor="cat-color">Color</Label>
          <Input
            id="cat-color"
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
  );
}
