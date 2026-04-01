"use client";

import { useState } from "react";
import {
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  triggerRecurringExpenses,
} from "@/actions/recurring";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuickCategoryButton } from "@/components/expenses/quick-category";
import { Plus, Pencil, Trash2, Play } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { toast } from "sonner";
import type { Category, RecurringExpenseWithCategory, ScheduleType } from "@/types";

type Props = {
  recurring: RecurringExpenseWithCategory[];
  categories: Category[];
};

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatSchedule(item: RecurringExpenseWithCategory): string {
  switch (item.schedule_type) {
    case "last_day":
      return "Último día del mes";
    case "last_weekday":
      return `Último ${WEEKDAYS[item.day_of_month ?? 0]} del mes`;
    case "bimonthly":
      return item.day_of_month ? `Cada 2 meses · día ${item.day_of_month}` : "Cada 2 meses";
    default:
      return item.day_of_month ? `Día ${item.day_of_month}` : "Mensual";
  }
}

export function RecurringList({ recurring, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringExpenseWithCategory | null>(null);
  const [isIncome, setIsIncome] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  function openCreate() {
    setEditingItem(null);
    setIsIncome(false);
    setScheduleType("monthly");
    setError(null);
    setOpen(true);
  }

  function openEdit(item: RecurringExpenseWithCategory) {
    setEditingItem(item);
    setIsIncome(item.amount > 0);
    setScheduleType(item.schedule_type || "monthly");
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("is_income", String(isIncome));
    formData.set("schedule_type", scheduleType);

    // For last_day, day_of_month is irrelevant
    if (scheduleType === "last_day") {
      formData.delete("day_of_month");
    }

    const result = editingItem
      ? await updateRecurringExpense(editingItem.id, formData)
      : await createRecurringExpense(formData);

    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success(editingItem ? "Movimiento fijo actualizado" : "Movimiento fijo añadido");
      setOpen(false);
      setEditingItem(null);
    }
    setLoading(false);
  }

  async function handleTrigger() {
    const ok = await confirm({
      title: "Generar movimientos fijos",
      description: "Se insertarán los movimientos fijos del mes actual que aún no se hayan generado. ¿Continuar?",
      confirmLabel: "Generar",
    });
    if (!ok) return;

    setTriggering(true);
    const result = await triggerRecurringExpenses();
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
    }
    setTriggering(false);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Eliminar movimiento fijo",
      description: "¿Estás seguro de que quieres desactivar este movimiento fijo?",
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (ok) {
      const result = await deleteRecurringExpense(id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Movimiento fijo eliminado");
      }
    }
  }

  const expenses = recurring.filter((r) => r.amount < 0);
  const income = recurring.filter((r) => r.amount > 0);

  // Show day selector for monthly/bimonthly
  const showDaySelector = scheduleType === "monthly" || scheduleType === "bimonthly";
  // Show weekday selector for last_weekday
  const showWeekdaySelector = scheduleType === "last_weekday";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Gastos e ingresos que se repiten cada mes
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleTrigger} disabled={triggering || recurring.length === 0}>
            <Play className="h-4 w-4 mr-1" /> {triggering ? "Generando..." : "Generar mes"}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Añadir
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingItem(null); }}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>{editingItem ? "Editar movimiento fijo" : "Nuevo movimiento fijo"}</DialogTitle>
          </DialogHeader>
          <form key={editingItem?.id ?? "new"} action={handleSubmit} className="space-y-4 px-5 py-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!isIncome ? "default" : "outline"}
                size="sm"
                onClick={() => setIsIncome(false)}
                className={!isIncome ? "bg-red-500 hover:bg-red-600 text-white" : ""}
              >
                Gasto
              </Button>
              <Button
                type="button"
                variant={isIncome ? "default" : "outline"}
                size="sm"
                onClick={() => setIsIncome(true)}
                className={isIncome ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
              >
                Ingreso
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="concept">Concepto</Label>
                <Input
                  id="concept"
                  name="concept"
                  defaultValue={editingItem?.concept || ""}
                  placeholder={isIncome ? "Ej: Nómina" : "Ej: Hipoteca"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Importe (EUR)</Label>
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
            </div>

            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  ["monthly", "Mensual"],
                  ["last_day", "Último día"],
                  ["last_weekday", "Último X día"],
                  ["bimonthly", "Bimensual"],
                ] as [ScheduleType, string][]).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setScheduleType(type)}
                    className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      scheduleType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {showDaySelector && (
                <div className="space-y-2">
                  <Label htmlFor="day_of_month">Día del mes</Label>
                  <select
                    id="day_of_month"
                    name="day_of_month"
                    defaultValue={editingItem?.day_of_month ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Sin día fijo</option>
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Día {i + 1}</option>
                    ))}
                  </select>
                </div>
              )}
              {showWeekdaySelector && (
                <div className="space-y-2">
                  <Label htmlFor="day_of_month">Día de la semana</Label>
                  <select
                    id="day_of_month"
                    name="day_of_month"
                    defaultValue={editingItem?.schedule_type === "last_weekday" ? (editingItem?.day_of_month ?? 4) : 4}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {WEEKDAYS.map((name, i) => (
                      <option key={i} value={i}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!isIncome && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <Label htmlFor="category_id">Categoría</Label>
                    <QuickCategoryButton />
                  </div>
                  <select
                    id="category_id"
                    name="category_id"
                    defaultValue={editingItem?.category_id || (categories.length === 1 ? categories[0].id : "")}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              )}
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
          No hay movimientos fijos configurados
        </p>
      ) : (
        <div className="space-y-5">
          {expenses.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gastos fijos</p>
              <div className="space-y-1">
                {expenses.map((item) => (
                  <RecurringItem key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
          {income.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingresos fijos</p>
              <div className="space-y-1">
                {income.map((item) => (
                  <RecurringItem key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}

function RecurringItem({
  item,
  onEdit,
  onDelete,
}: {
  item: RecurringExpenseWithCategory;
  onEdit: (item: RecurringExpenseWithCategory) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border/70 hover:bg-muted/35">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
        style={{
          backgroundColor: (item.category?.color || "#64748b") + "15",
        }}
      >
        {item.category?.icon || "📦"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-foreground truncate">
          {item.concept || item.category?.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {item.category?.name} · {formatSchedule(item)}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-[15px] font-semibold tabular-nums ${item.amount > 0 ? "text-income" : "text-expense"}`}>
          <Amount value={item.amount} />
        </span>
        <div className="flex items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <button
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => onEdit(item)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded text-muted-foreground hover:text-expense transition-colors cursor-pointer"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
