"use client";

import { useState } from "react";
import {
  createInvestmentType,
  updateInvestmentType,
  deleteInvestmentType,
  setInvestmentTypesOrder,
} from "@/actions/investments";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Settings2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { InvestmentType, InvestmentFundWithType } from "@/types";

type Props = {
  types: InvestmentType[];
  funds: InvestmentFundWithType[];
};

export function InvestmentTypeManager({ types, funds }: Props) {
  const [localTypes, setLocalTypes] = useState<InvestmentType[]>(types);
  const [listOpen, setListOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<InvestmentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function openCreate() {
    setEditingType(null);
    setFormOpen(true);
    setListOpen(false);
  }

  function openEdit(type: InvestmentType) {
    setEditingType(type);
    setFormOpen(true);
    setListOpen(false);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const result = editingType
      ? await updateInvestmentType(editingType.id, formData)
      : await createInvestmentType(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(editingType ? "Tipo actualizado" : "Tipo creado");
      setFormOpen(false);
      setEditingType(null);
    }
    setLoading(false);
  }

  async function handleDelete(type: InvestmentType) {
    const hasFunds = funds.some((f) => f.type_id === type.id);
    if (hasFunds) {
      toast.error("No puedes eliminar un tipo con fondos asociados. Elimina los fondos primero.");
      return;
    }

    const ok = await confirm({
      title: "Eliminar tipo de inversión",
      description: `¿Eliminar "${type.name}"?`,
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (ok) {
      const result = await deleteInvestmentType(type.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Tipo eliminado");
      }
    }
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  async function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const next = [...localTypes];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    setLocalTypes(next);
    setDragIdx(null);
    setDragOverIdx(null);
    await setInvestmentTypesOrder(next.map((t) => t.id));
  }

  function handleDragEnd() {
    setDragIdx(null);
    setDragOverIdx(null);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setListOpen(true)}>
        <Settings2 className="h-4 w-4 mr-1" /> Tipos
      </Button>

      {/* Type list dialog */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent variant="sheet" className="sm:max-w-md">
          <DialogHeader variant="bar">
            <DialogTitle>Tipos de inversión</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {localTypes.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay tipos de inversión. Crea uno para empezar.
              </p>
            ) : (
              <div className="space-y-1">
                {localTypes.map((type, idx) => {
                  const fundCount = funds.filter((f) => f.type_id === type.id).length;
                  const isDragging = dragIdx === idx;
                  const isOver = dragOverIdx === idx && dragIdx !== idx;
                  return (
                    <div
                      key={type.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={handleDragEnd}
                      className={`group flex items-center justify-between rounded-md px-3 py-2.5 transition-colors cursor-grab active:cursor-grabbing
                        ${isDragging ? "opacity-40" : ""}
                        ${isOver ? "bg-muted/60 ring-1 ring-border" : "hover:bg-muted/35"}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        <span className="text-sm font-medium">{type.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {fundCount} {fundCount === 1 ? "fondo" : "fondos"}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          onClick={() => openEdit(type)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-expense transition-colors cursor-pointer"
                          onClick={() => handleDelete(type)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Button size="sm" onClick={openCreate} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Añadir tipo
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Create/Edit type dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingType(null); }}>
        <DialogContent variant="sheet" className="sm:max-w-md">
          <DialogHeader variant="bar">
            <DialogTitle>{editingType ? "Editar tipo" : "Nuevo tipo de inversión"}</DialogTitle>
          </DialogHeader>
          <form key={editingType?.id ?? "new"} action={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingType?.name || ""}
                placeholder="Ej: Renta variable"
                required
              />
            </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
            <Button type="submit" className="h-12 w-full md:h-10" disabled={loading}>
              {loading ? "Guardando..." : editingType ? "Actualizar" : "Crear"}
            </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
