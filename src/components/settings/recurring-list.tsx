"use client";

import { useState } from "react";
import {
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from "@/actions/recurring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import type { Category, RecurringExpenseWithCategory } from "@/types";

type Props = {
  recurring: RecurringExpenseWithCategory[];
  categories: Category[];
};

export function RecurringList({ recurring, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringExpenseWithCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditingItem(null);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: RecurringExpenseWithCategory) {
    setEditingItem(item);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = editingItem
      ? await updateRecurringExpense(editingItem.id, formData)
      : await createRecurringExpense(formData);

    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success(editingItem ? "Gasto fijo actualizado" : "Gasto fijo añadido");
      setOpen(false);
      setEditingItem(null);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (confirm("¿Desactivar este gasto fijo?")) {
      const result = await deleteRecurringExpense(id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Gasto fijo eliminado");
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Gastos que se repiten cada mes (hipoteca, seguros, etc.)
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Añadir
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingItem(null); }}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>{editingItem ? "Editar gasto fijo" : "Nuevo gasto fijo"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto</Label>
              <Input
                id="concept"
                name="concept"
                defaultValue={editingItem?.concept || ""}
                placeholder="Ej: Hipoteca"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Importe mensual (EUR)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={editingItem ? Math.abs(editingItem.amount) : ""}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="day_of_month">Día del mes (opcional)</Label>
                <Input
                  id="day_of_month"
                  name="day_of_month"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={editingItem?.day_of_month || ""}
                  placeholder="1-31"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoría</Label>
              <select
                id="category_id"
                name="category_id"
                defaultValue={editingItem?.category_id || ""}
                required
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Selecciona categoría
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : editingItem ? "Actualizar" : "Guardar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {recurring.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No hay gastos fijos configurados
        </p>
      ) : (
        <div className="space-y-1">
          {recurring.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 transition-colors hover:border-border/70 hover:bg-muted/35"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{
                  backgroundColor: (item.category?.color || "#64748b") + "15",
                }}
              >
                {item.category?.icon || "📦"}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.concept || item.category?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.category?.name}
                  {item.day_of_month && ` · día ${item.day_of_month}`}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm font-semibold tabular-nums text-expense">
                  {formatCurrency(item.amount)}
                </span>
                <div className="flex items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded text-muted-foreground hover:text-expense transition-colors cursor-pointer"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
