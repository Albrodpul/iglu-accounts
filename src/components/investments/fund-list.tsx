"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createInvestmentFund,
  updateInvestmentFund,
  updateFundProfitability,
  deleteInvestmentFund,
  createContribution,
  updateContribution,
  getContributions,
  deleteContribution,
  refreshInvestmentNav,
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
import { Plus, Pencil, Trash2, History, TrendingUp, TrendingDown, MoreVertical, Percent, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import { toast } from "sonner";
import type { InvestmentType, InvestmentFundWithType, InvestmentContribution } from "@/types";

type Props = {
  types: InvestmentType[];
  funds: InvestmentFundWithType[];
};

export function FundList({ types, funds }: Props) {
  const router = useRouter();
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
  const [refreshing, setRefreshing] = useState(false);
  const [showNegative, setShowNegative] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  const hasIsinFunds = funds.some((f) => f.isin);

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
    setShowNegative(true);
    setFundOpen(true);
  }

  function openEditFund(fund: InvestmentFundWithType) {
    setEditingFund(fund);
    setShowNegative(fund.show_negative_returns);
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

  async function handleRefreshNav() {
    setRefreshing(true);
    const result = await refreshInvestmentNav();
    if (result.error) {
      toast.error(result.error);
    } else if (result.updated === 0) {
      toast.error("No se actualizó ningún fondo");
    } else {
      toast.success(
        result.updated === 1
          ? "Rentabilidad actualizada (1 fondo)"
          : `Rentabilidad actualizada (${result.updated} fondos)`,
      );
      router.refresh();
    }
    setRefreshing(false);
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

  // Apply show_negative_returns setting: if false and return < 0, clamp to 0
  function getDisplayReturn(fund: InvestmentFundWithType): number {
    const ret = fund.current_value - fund.invested_amount;
    if (!fund.show_negative_returns && ret < 0) return 0;
    return ret;
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold md:text-xl">Fondos de inversión</h2>
          <div className="flex items-center gap-2 shrink-0">
            {hasIsinFunds && (
              <button
                type="button"
                onClick={handleRefreshNav}
                disabled={refreshing}
                title="Actualizar valor liquidativo (NAV)"
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Actualizar NAV</span>
              </button>
            )}
            {types.length > 0 && (
              <Button size="sm" onClick={openCreateFund}>
                <Plus className="h-4 w-4 mr-1" /> Añadir fondo
              </Button>
            )}
          </div>
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
              const totalDisplayValue = typeFunds.reduce((s, f) => {
                const displayRet = getDisplayReturn(f);
                return s + f.invested_amount + displayRet;
              }, 0);
              const totalReturnAmt = totalDisplayValue - totalInvested;
              const totalReturnPct = getReturnPct(totalInvested, totalDisplayValue);

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
                        Val: <Amount value={totalDisplayValue} className="font-semibold text-foreground tabular-nums" />
                      </span>
                      <span className={`font-semibold tabular-nums ${totalReturnAmt >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        <Amount value={totalReturnAmt} prefix={totalReturnAmt >= 0 ? "+" : ""} suffix={` (${totalReturnPct >= 0 ? "+" : ""}${totalReturnPct.toFixed(2)}%)`} />
                      </span>
                    </div>
                  </div>

                  {/* Fund items */}
                  <div className="space-y-1">
                    {typeFunds.map((fund) => {
                      const displayReturn = getDisplayReturn(fund);
                      const displayValue = fund.invested_amount + displayReturn;
                      const returnPct = getReturnPct(fund.invested_amount, displayValue);
                      const weight = totalDisplayValue > 0
                        ? ((displayValue / totalDisplayValue) * 100).toFixed(1)
                        : "0.0";

                      return (
                        <div
                          key={fund.id}
                          className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border/70 hover:bg-muted/35 md:px-3 md:py-3"
                        >
                          {/* Icon */}
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
                            {displayReturn >= 0 ? (
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
                              {fund.isin && <span className="ml-1 font-mono text-[10px] opacity-60">{fund.isin}</span>}
                            </p>
                          </div>

                          {/* Values — aligned */}
                          <div className="text-right shrink-0">
                            <p className="text-[15px] font-semibold tabular-nums">
                              <Amount value={displayValue} />
                            </p>
                            <p className={`text-xs font-medium tabular-nums ${displayReturn >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              <Amount value={displayReturn} prefix={displayReturn >= 0 ? "+" : ""} suffix={` (${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%)`} />
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
            {/* Pass show_negative_returns as hidden field; visual toggle updates state */}
            <input type="hidden" name="show_negative_returns" value={showNegative ? "true" : "false"} />

            <div className="space-y-2">
              <Label htmlFor="fund_name">Nombre</Label>
              <Input
                id="fund_name"
                name="name"
                defaultValue={editingFund?.name || ""}
                placeholder="Ej: MSCI World"
                required
              />
            </div>

            {!editingFund && (
              <div className="space-y-2">
                <Label htmlFor="type_id">Tipo de inversión</Label>
                <select
                  id="type_id"
                  name="type_id"
                  defaultValue={types.length === 1 ? types[0].id : ""}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="" disabled>Selecciona tipo</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fund_isin">
                ISIN <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="fund_isin"
                name="isin"
                defaultValue={editingFund?.isin ?? ""}
                placeholder="Ej: LU0080237943"
                maxLength={12}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Con ISIN, el cron actualizará la rentabilidad automáticamente
              </p>
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

            {!editingFund && (
              <div className="space-y-2">
                <Label htmlFor="initial_price">
                  Precio de compra (€/participación) <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="initial_price"
                  name="purchase_price"
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  defaultValue=""
                  placeholder="Ej: 12.72"
                />
              </div>
            )}

            {/* show_negative_returns toggle */}
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 px-3 py-3 hover:bg-muted/20 transition-colors">
              <div>
                <p className="text-sm font-medium">Reflejar pérdidas</p>
                <p className="text-xs text-muted-foreground">Desactivado → las pérdidas se guardan como 0 € (valor = aportado)</p>
              </div>
              <div className="relative ml-4 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showNegative}
                  onChange={(e) => setShowNegative(e.target.checked)}
                />
                <div className="h-6 w-11 rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-emerald-500" />
                <div className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </div>
            </label>

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
              <Label htmlFor="contrib_price">
                Precio de compra (€/participación) <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="contrib_price"
                name="purchase_price"
                type="number"
                step="0.000001"
                min="0.000001"
                defaultValue={editingContrib?.purchase_price ?? ""}
                placeholder="Ej: 12.72"
              />
              <p className="text-xs text-muted-foreground">
                Necesario para que el cron calcule la rentabilidad por unidades
              </p>
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
                {contributions.map((c) => {
                  const units = c.purchase_price && c.purchase_price > 0
                    ? c.amount / c.purchase_price
                    : null;
                  return (
                    <div key={c.id} className="group flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-muted/35">
                      <div>
                        <p className="text-sm font-medium tabular-nums"><Amount value={c.amount} /></p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.contribution_date).toLocaleDateString("es-ES")}
                          {c.purchase_price && (
                            <span className="ml-1 font-mono">@ {c.purchase_price}€</span>
                          )}
                          {units !== null && (
                            <span className="ml-1 opacity-70">= {units.toFixed(4)} part.</span>
                          )}
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
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
