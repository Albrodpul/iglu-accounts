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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Plus, Pencil, Trash2, Settings2, GripVertical, Loader2, X } from "lucide-react";
import { SwipeRow } from "@/components/ui/swipe-row";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SAVE_FAILED_MESSAGE } from "@/lib/errors";
import type { InvestmentType, InvestmentFundWithType } from "@/types";

type Props = {
  types: InvestmentType[];
  funds: InvestmentFundWithType[];
};

export function InvestmentTypeManager({ types, funds }: Props) {
  const [localTypes, setLocalTypes] = useState<InvestmentType[]>(types);
  // A fresh server render (after a create, rename or delete) replaces the local copy.
  const [prevTypes, setPrevTypes] = useState(types);
  if (prevTypes !== types) {
    setPrevTypes(types);
    setLocalTypes(types);
  }
  const [listOpen, setListOpen] = useState(false);
  // Renaming happens in the row itself: no second sheet for a single field.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function startEdit(type: InvestmentType) {
    setEditingId(type.id);
    setEditName(type.name);
  }

  /** Creates (no `id`) or renames a type. Resolves to whether it was saved. */
  async function save(name: string, id: string | null) {
    const trimmed = name.trim();
    if (!trimmed || loading) return false;
    const formData = new FormData();
    formData.set("name", trimmed);
    setLoading(true);
    try {
      const result = id ? await updateInvestmentType(id, formData) : await createInvestmentType(formData);
      if (result?.error) {
        toast.error(result.error);
        return false;
      }
      toast.success(id ? "Tipo actualizado" : "Tipo creado");
      if (id) setLocalTypes((current) => current.map((t) => (t.id === id ? { ...t, name: trimmed } : t)));
      return true;
    } catch {
      toast.error(SAVE_FAILED_MESSAGE);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(type: InvestmentType) {
    const hasFunds = funds.some((f) => f.type_id === type.id);
    if (hasFunds) {
      toast.error("No puedes eliminar un tipo con fondos asociados. Elimina los fondos primero.");
      return;
    }

    await confirm({
      title: "Eliminar tipo de inversión",
      description: `¿Eliminar "${type.name}"?`,
      confirmLabel: "Eliminar",
      variant: "destructive",
      onConfirm: async () => {
        const result = await deleteInvestmentType(type.id);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Tipo eliminado");
        }
      },
    });
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

      <Dialog open={listOpen} onOpenChange={(v) => { setListOpen(v); if (!v) setEditingId(null); }}>
        <DialogContent variant="sheet" className="sm:max-w-md">
          <DialogHeader variant="bar">
            <DialogTitle>Tipos de inversión</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {localTypes.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay tipos de inversión. Escribe abajo el primero.
              </p>
            ) : (
              <div className="space-y-1">
                {localTypes.map((type, idx) => {
                  const fundCount = funds.filter((f) => f.type_id === type.id).length;
                  const isDragging = dragIdx === idx;
                  const isOver = dragOverIdx === idx && dragIdx !== idx;
                  const editing = editingId === type.id;
                  return (
                    <div
                      key={type.id}
                      draggable={!editing}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={handleDragEnd}
                      className={cn("rounded-lg", isDragging && "opacity-40", isOver && "bg-muted/60 ring-1 ring-border")}
                    >
                      {editing ? (
                        <form
                          className="flex items-center gap-1.5 px-1 py-1"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (await save(editName, type.id)) setEditingId(null);
                          }}
                        >
                          <Input
                            aria-label={`Nuevo nombre de ${type.name}`}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                e.stopPropagation();
                                setEditingId(null);
                              }
                            }}
                            maxLength={100}
                            autoFocus
                            className="h-10 flex-1"
                          />
                          <Button
                            type="submit"
                            size="icon"
                            aria-label="Guardar nombre"
                            className="h-10 w-10 shrink-0"
                            disabled={loading || !editName.trim()}
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Cancelar"
                            className="h-10 w-10 shrink-0"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </form>
                      ) : (
                        // Same pattern as the movement lists: tap to rename, swipe left to delete.
                        <SwipeRow
                          onTap={() => startEdit(type)}
                          onDelete={() => handleDelete(type)}
                          className="group flex items-center justify-between gap-2 rounded-lg px-3 py-3 transition-colors hover:bg-muted/35 md:cursor-grab md:py-2 md:active:cursor-grabbing"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 md:block" />
                            <span className="truncate text-[15px] font-medium md:text-sm">{type.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {fundCount} {fundCount === 1 ? "fondo" : "fondos"}
                            </span>
                          </div>
                          <Pencil aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground/60 md:hidden" />
                          <div className="hidden items-center md:flex md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                            <button
                              type="button"
                              aria-label={`Renombrar ${type.name}`}
                              title="Renombrar"
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); startEdit(type); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Eliminar ${type.name}`}
                              title="Eliminar"
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-expense"
                              onClick={(e) => { e.stopPropagation(); handleDelete(type); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </SwipeRow>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </DialogBody>
          {/* Adding is one field: it lives here, not in a second sheet. */}
          <form
            className="flex shrink-0 gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await save(newName, null)) setNewName("");
            }}
          >
            <Input
              aria-label="Nombre del nuevo tipo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nuevo tipo (ej: Renta variable)"
              maxLength={100}
              className="h-12 flex-1 md:h-10"
            />
            <Button type="submit" className="h-12 shrink-0 md:h-10" disabled={loading || !newName.trim()}>
              {loading && !editingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Añadir
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
