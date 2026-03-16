"use client";

import { useState } from "react";
import {
  createRecurringExpense,
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Category, RecurringExpenseWithCategory } from "@/types";

type Props = {
  recurring: RecurringExpenseWithCategory[];
  categories: Category[];
};

export function RecurringList({ recurring, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createRecurringExpense(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setOpen(false);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (confirm("¿Desactivar este gasto fijo?")) {
      await deleteRecurringExpense(id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Gastos que se repiten cada mes (hipoteca, seguros, etc.)
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Añadir
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo gasto fijo</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="concept">Concepto</Label>
                <Input
                  id="concept"
                  name="concept"
                  placeholder="Ej: Hipoteca"
                  required
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
                    placeholder="1-31"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Categoría</Label>
                <select
                  id="category_id"
                  name="category_id"
                  required
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="" disabled selected>
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
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {recurring.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No hay gastos fijos configurados
        </p>
      ) : (
        <div className="space-y-2">
          {recurring.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: item.category?.color || "#64748b",
                      color: item.category?.color || "#64748b",
                    }}
                  >
                    {item.category?.icon} {item.category?.name}
                  </Badge>
                  <span className="text-sm font-medium">{item.concept}</span>
                  {item.day_of_month && (
                    <span className="text-xs text-muted-foreground">
                      (día {item.day_of_month})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600">
                    {formatCurrency(item.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
