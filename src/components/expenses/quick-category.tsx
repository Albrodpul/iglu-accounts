"use client";

import { useState } from "react";
import { createCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type Props = {
  onCreated?: () => void;
};

export function QuickCategoryButton({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      setSelectedIcon("");
      onCreated?.();
    }
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Nueva categoría
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); setSelectedIcon(""); } }}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="qc-name">Nombre</Label>
              <Input
                id="qc-name"
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
                <Label htmlFor="qc-color">Color</Label>
                <Input
                  id="qc-color"
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
    </>
  );
}
