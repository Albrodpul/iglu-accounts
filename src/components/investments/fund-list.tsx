"use client";

import { useState } from "react";
import {
  createInvestmentFund,
  updateInvestmentFund,
  updateFundProfitability,
  deleteInvestmentFund,
  createContribution,
  updateContribution,
  getContributions,
  deleteContribution,
} from "@/actions/investments";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, History, TrendingUp, TrendingDown, MoreVertical, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import { toast } from "sonner";
import type { InvestmentType, InvestmentFundWithType, InvestmentContribution } from "@/types";

type Props = {
  types: InvestmentType[];
  funds: InvestmentFundWithType[];
};

export function FundList({ types, funds }: Props) {
  const [fundOpen, setFundOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<InvestmentFundWithType | null>(null);
  const [profitOpen, setProfitOpen] = useState(false);
  const [profitFund, setProfitFund] = useState<InvestmentFundWithType | null>(null);
  const [contribOpen, setContribOpen] = useState(false);
  const [contribFund, setContribFund] = useState<InvestmentFundWithType | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFund, setHistoryFund] = useState<InvestmentFundWithType | null>(null);
  const [contributions, setContributions] = useState<InvestmentContribution[]>([]);
  const [editingContrib, setEditingContrib] = useState<InvestmentContribution | null>(null);
  const [loading, setLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  // Group funds by type
  const fundsByType = new Map<string, { type: InvestmentType; funds: InvestmentFundWithType[] }>();
  for (const type of types) {
    fundsByType.set(type.id, { type, funds: [] });
  }
  for (const fund of funds) {
    const group = fundsByType.get(fund.type_id);
    if (group) group.funds.push(fund);
  }

  function openCreateFund() {
    setEditingFund(null);
    setFundOpen(true);
  }

  function openEditFund(fund: InvestmentFundWithType) {
    setEditingFund(fund);
    setFundOpen(true);
  }

  function openEditProfitability(fund: InvestmentFundWithType) {
    setProfitFund(fund);
    setProfitOpen(true);
  }

  function openAddContribution(fund: InvestmentFundWithType) {
    setContribFund(fund);
    setContribOpen(true);
  }

  async function openHistory(fund: InvestmentFundWithType) {
    setHistoryFund(fund);
    setHistoryOpen(true);
    const data = await getContributions(fund.id);
    setContributions(data);
  }

  async function handleFundSubmit(formData: FormData) {
    setLoading(true);
    const result = editingFund
      ? await updateInvestmentFund(editingFund.id, formData)
      : await createInvestmentFund(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(editingFund ? "Fondo actualizado" : "Fondo creado");
      setFundOpen(false);
      setEditingFund(null);
    }
    setLoading(false);
  }

  async function handleProfitSubmit(formData: FormData) {
    if (!profitFund) return;
    setLoading(true);
    const result = await updateFundProfitability(profitFund.id, formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Rentabilidad actualizada");
      setProfitOpen(false);
      setProfitFund(null);
    }
    setLoading(false);
  }

  async function handleContribSubmit(formData: FormData) {
    setLoading(true);
    if (editingContrib) {
      const result = await updateContribution(editingContrib.id, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Aportación actualizada");
        setContribOpen(false);
        setContribFund(null);
        setEditingContrib(null);
      }
    } else {
      const result = await createContribution(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Aportación registrada");
        setContribOpen(false);
        setContribFund(null);
      }
    }
    setLoading(false);
  }

  function openEditContribution(contrib: InvestmentContribution, fund: InvestmentFundWithType) {
    setEditingContrib(contrib);
    setContribFund(fund);
    setContribOpen(true);
    setHistoryOpen(false);
  }

  async function handleDeleteFund(fund: InvestmentFundWithType) {
    const ok = await confirm({
      title: "Eliminar fondo",
      description: `¿Eliminar "${fund.name}"? Se perderá todo el historial de aportaciones.`,
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (ok) {
      const result = await deleteInvestmentFund(fund.id);
      if (result?.error) toast.error(result.error);
      else toast.success("Fondo eliminado");
    }
  }

  async function handleDeleteContribution(contrib: InvestmentContribution) {
    const ok = await confirm({
      title: "Eliminar aportación",
      description: `¿Eliminar aportación de ${formatCurrency(contrib.amount)}?`,
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (ok) {
      const result = await deleteContribution(contrib.id, contrib.fund_id, contrib.amount);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Aportación eliminada");
        setContributions((prev) => prev.filter((c) => c.id !== contrib.id));
      }
    }
  }

  function getReturnPct(invested: number, current: number): number {
    if (invested === 0) return 0;
    return ((current - invested) / invested) * 100;
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold md:text-xl">Fondos de inversión</h2>
          {types.length > 0 && (
            <Button size="sm" onClick={openCreateFund}>
              <Plus className="h-4 w-4 mr-1" /> Añadir fondo
            </Button>
          )}
        </div>

        {types.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            Crea un tipo de inversión primero
          </p>
        ) : funds.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            No hay fondos. Añade tu primer fondo de inversión.
          </p>
        ) : (
          Array.from(fundsByType.values())
            .filter((group) => group.funds.length > 0)
            .map(({ type, funds: typeFunds }) => {
              const totalInvested = typeFunds.reduce((s, f) => s + f.invested_amount, 0);
              const totalValue = typeFunds.reduce((s, f) => s + f.current_value, 0);
              const totalReturnAmt = totalValue - totalInvested;
              const totalReturnPct = getReturnPct(totalInvested, totalValue);

              return (
                <div key={type.id} className="space-y-3">
                  {/* Type header — responsive */}
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {type.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs md:text-sm">
                      <span className="text-muted-foreground">
                        Inv: <Amount value={totalInvested} className="font-semibold text-foreground tabular-nums" />
                      </span>
                      <span className="text-muted-foreground">
                        Val: <Amount value={totalValue} className="font-semibold text-foreground tabular-nums" />
                      </span>
                      <span className={`font-semibold tabular-nums ${totalReturnAmt >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        <Amount value={totalReturnAmt} prefix={totalReturnAmt >= 0 ? "+" : ""} suffix={` (${totalReturnPct >= 0 ? "+" : ""}${totalReturnPct.toFixed(2)}%)`} />
                      </span>
                    </div>
                  </div>

                  {/* Fund items */}
                  <div className="space-y-1">
                    {typeFunds.map((fund) => {
                      const returnAmt = fund.current_value - fund.invested_amount;
                      const returnPct = getReturnPct(fund.invested_amount, fund.current_value);
                      const weight = totalValue > 0
                        ? ((fund.current_value / totalValue) * 100).toFixed(1)
                        : "0.0";

                      return (
                        <div
                          key={fund.id}
                          className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border/70 hover:bg-muted/35 md:px-3 md:py-3"
                        >
                          {/* Icon */}
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
                            {returnAmt >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-rose-500" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-medium text-foreground truncate">
                              {fund.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Inv: <Amount value={fund.invested_amount} /> · Peso: {weight}%
                            </p>
                          </div>

                          {/* Values — aligned */}
                          <div className="text-right shrink-0">
                            <p className="text-[15px] font-semibold tabular-nums">
                              <Amount value={fund.current_value} />
                            </p>
                            <p className={`text-xs font-medium tabular-nums ${returnAmt >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              <Amount value={returnAmt} prefix={returnAmt >= 0 ? "+" : ""} suffix={` (${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%)`} />
                            </p>
                          </div>

                          {/* Actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom" className="min-w-44">
                              <DropdownMenuItem className="py-3" onClick={() => openAddContribution(fund)}>
                                <Plus className="h-4 w-4" /> Añadir aportación
                              </DropdownMenuItem>
                              <DropdownMenuItem className="py-3" onClick={() => openHistory(fund)}>
                                <History className="h-4 w-4" /> Historial
                              </DropdownMenuItem>
                              <DropdownMenuItem className="py-3" onClick={() => openEditFund(fund)}>
                                <Pencil className="h-4 w-4" /> Editar fondo
                              </DropdownMenuItem>
                              <DropdownMenuItem className="py-3" onClick={() => openEditProfitability(fund)}>
                                <Percent className="h-4 w-4" /> Editar rentabilidad
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="py-3" variant="destructive" onClick={() => handleDeleteFund(fund)}>
                                <Trash2 className="h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Fund create/edit dialog */}
      <Dialog open={fundOpen} onOpenChange={(v) => { setFundOpen(v); if (!v) setEditingFund(null); }}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>{editingFund ? "Editar fondo" : "Nuevo fondo"}</DialogTitle>
          </DialogHeader>
          <form key={editingFund?.id ?? "new"} action={handleFundSubmit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="fund_name">Nombre</Label>
              <Input
                id="fund_name"
                name="name"
                defaultValue={editingFund?.name || ""}
                placeholder="Ej: Trade Republic"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type_id">Tipo de inversión</Label>
              <select
                id="type_id"
                name="type_id"
                defaultValue={editingFund?.type_id || (types.length === 1 ? types[0].id : "")}
                required
                disabled={!!editingFund}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <option value="" disabled>Selecciona tipo</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {!editingFund && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initial_amount">Inversión inicial (EUR)</Label>
                  <Input
                    id="initial_amount"
                    name="initial_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue=""
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contrib_date">Fecha</Label>
                  <Input
                    id="contrib_date"
                    name="contribution_date"
                    type="date"
                    defaultValue={today}
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : editingFund ? "Actualizar" : "Crear"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Profitability edit dialog */}
      <Dialog open={profitOpen} onOpenChange={(v) => { setProfitOpen(v); if (!v) setProfitFund(null); }}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>Editar rentabilidad · {profitFund?.name}</DialogTitle>
          </DialogHeader>
          <form key={profitFund?.id ?? "profit"} action={handleProfitSubmit} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <Label>Invertido (EUR)</Label>
              <p className="flex h-10 items-center text-sm font-semibold tabular-nums text-muted-foreground">
                {profitFund ? <Amount value={profitFund.invested_amount} /> : "—"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profit_return">Rentabilidad (EUR)</Label>
              <Input
                id="profit_return"
                name="return_amount"
                type="number"
                step="0.01"
                defaultValue={profitFund ? Math.round((profitFund.current_value - profitFund.invested_amount) * 100) / 100 : 0}
                placeholder="0.00"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Ganancia o pérdida del fondo. Ej: 12.50 si has ganado 12,50€
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : "Actualizar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution create/edit dialog */}
      <Dialog open={contribOpen} onOpenChange={(v) => { setContribOpen(v); if (!v) { setContribFund(null); setEditingContrib(null); } }}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>{editingContrib ? "Editar aportación" : "Nueva aportación"} · {contribFund?.name}</DialogTitle>
          </DialogHeader>
          <form key={editingContrib?.id ?? contribFund?.id ?? "contrib"} action={handleContribSubmit} className="space-y-4 px-5 py-4">
            <input type="hidden" name="fund_id" value={contribFund?.id || ""} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contrib_amount">Importe (EUR)</Label>
                <Input
                  id="contrib_amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={editingContrib?.amount ?? ""}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contribution_date">Fecha</Label>
                <Input
                  id="contribution_date"
                  name="contribution_date"
                  type="date"
                  defaultValue={editingContrib?.contribution_date ?? today}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrib_notes">Notas</Label>
              <Input
                id="contrib_notes"
                name="notes"
                defaultValue={editingContrib?.notes ?? ""}
                placeholder="Opcional"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : editingContrib ? "Actualizar" : "Registrar aportación"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution history dialog */}
      <Dialog open={historyOpen} onOpenChange={(v) => { setHistoryOpen(v); if (!v) setHistoryFund(null); }}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>Historial · {historyFund?.name}</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
            {contributions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Sin aportaciones registradas</p>
            ) : (
              <div className="space-y-1">
                {contributions.map((c) => (
                  <div key={c.id} className="group flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-muted/35">
                    <div>
                      <p className="text-sm font-medium tabular-nums"><Amount value={c.amount} /></p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.contribution_date).toLocaleDateString("es-ES")}
                        {c.notes && ` · ${c.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <button
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        onClick={() => historyFund && openEditContribution(c, historyFund)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded text-muted-foreground hover:text-expense transition-colors cursor-pointer"
                        onClick={() => handleDeleteContribution(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
