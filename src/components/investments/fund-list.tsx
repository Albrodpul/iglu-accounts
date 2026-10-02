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
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
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
import { Plus, Pencil, Trash2, History, TrendingUp, MoreVertical, Percent, Loader2 } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { fundColors, positionValue } from "@/lib/investments";
import { cn } from "@/lib/utils";
import { toLocalISODate } from "@/lib/dates";
import { Amount } from "@/components/ui/amount";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { SAVE_FAILED_MESSAGE } from "@/lib/errors";
import type { InvestmentType, InvestmentFundWithType, InvestmentContribution } from "@/types";

type Props = {
  types: InvestmentType[];
  funds: InvestmentFundWithType[];
};

/** From `xl` up, type headers and fund rows share these columns so figures line up. */
const TABLE_COLS = "xl:grid xl:grid-cols-[minmax(0,1fr)_7rem_7rem_11rem_3.5rem_2rem] xl:items-center xl:gap-x-4";

/** Share of the portfolio, as on the chart legend: "30 %", or "<1 %" for crumbs. */
function formatWeight(value: number, total: number): string {
  if (total <= 0) return formatPercent(0, { decimals: 0 });
  const pct = (value / total) * 100;
  return pct > 0 && pct < 1 ? `<${formatPercent(1, { decimals: 0 })}` : formatPercent(pct, { decimals: 0 });
}

/** Gain or loss: green or red with its percentage, and neutral when there is none. */
function ReturnText({ amount, pct, className }: { amount: number; pct: number; className?: string }) {
  const cents = Math.round(amount * 100);
  if (cents === 0) {
    return (
      <span className={cn("tabular-nums text-muted-foreground", className)}>
        <Amount value={0} />
      </span>
    );
  }
  return (
    <span className={cn("tabular-nums", cents > 0 ? "text-income" : "text-expense", className)}>
      <Amount value={amount} prefix={cents > 0 ? "+" : ""} suffix={` (${formatPercent(pct, { signed: true })})`} />
    </span>
  );
}

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
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showNegative, setShowNegative] = useState(true);
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
    setContributions([]);
    setHistoryLoading(true);
    setHistoryOpen(true);
    const data = await getContributions(fund.id);
    setContributions(data);
    setHistoryLoading(false);
  }

  async function handleFundSubmit(formData: FormData) {
    setLoading(true);
    try {
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
    } catch {
      toast.error(SAVE_FAILED_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  async function handleProfitSubmit(formData: FormData) {
    if (!profitFund) return;
    setLoading(true);
    try {
      const result = await updateFundProfitability(profitFund.id, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Rentabilidad actualizada");
        setProfitOpen(false);
        setProfitFund(null);
      }
    } catch {
      toast.error(SAVE_FAILED_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  async function handleContribSubmit(formData: FormData) {
    setLoading(true);
    try {
      if (editingContrib) {
        const result = await updateContribution(editingContrib.id, formData);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Aportación actualizada");
          setContribOpen(false);
          setEditingContrib(null);
          // Refresh history list in background
          if (historyFund) {
            const data = await getContributions(historyFund.id);
            setContributions(data);
          }
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
    } catch {
      toast.error(SAVE_FAILED_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  function openEditContribution(contrib: InvestmentContribution, fund: InvestmentFundWithType) {
    setEditingContrib(contrib);
    setContribFund(fund);
    setContribOpen(true);
    // Keep historyOpen — edit dialog stacks on top
  }

  async function handleDeleteFund(fund: InvestmentFundWithType) {
    await confirm({
      title: "Eliminar fondo",
      description: `¿Eliminar "${fund.name}"? Se perderá todo el historial de aportaciones.`,
      confirmLabel: "Eliminar",
      variant: "destructive",
      onConfirm: async () => {
        const result = await deleteInvestmentFund(fund.id);
        if (result?.error) toast.error(result.error);
        else toast.success("Fondo eliminado");
      },
    });
  }

  async function handleDeleteContribution(contrib: InvestmentContribution) {
    await confirm({
      title: "Eliminar aportación",
      description: `¿Eliminar aportación de ${formatCurrency(contrib.amount)}?`,
      confirmLabel: "Eliminar",
      variant: "destructive",
      onConfirm: async () => {
        const result = await deleteContribution(contrib.id, contrib.fund_id, contrib.amount);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Aportación eliminada");
          setContributions((prev) => prev.filter((c) => c.id !== contrib.id));
        }
      },
    });
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

  const today = toLocalISODate();
  // Weights are over the whole portfolio, and colours match the distribution chart.
  const portfolioValue = funds.reduce((sum, fund) => sum + positionValue(fund), 0);
  const colors = fundColors(funds);

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold md:text-xl">Posiciones</h2>
          <div className="flex items-center gap-2 shrink-0">
            {types.length > 0 && (
              <Button size="sm" onClick={openCreateFund}>
                <Plus className="h-4 w-4 mr-1" /> Añadir fondo
              </Button>
            )}
          </div>
        </div>

        {types.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            message="Crea primero un tipo de inversión (botón «Tipos») para poder añadir fondos."
          />
        ) : funds.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            message="No hay fondos todavía. Añade el primero para seguir su rentabilidad."
            action={{ label: "Añadir fondo", onClick: openCreateFund }}
          />
        ) : (
          <>
            {/* Wide screens read this as a table: one column per figure. */}
            <div className={cn("hidden border-b border-border/60 px-3 pb-2 text-xs font-semibold text-muted-foreground", TABLE_COLS)}>
              <span>Posición</span>
              <span className="text-right">Invertido</span>
              <span className="text-right">Valor</span>
              <span className="text-right">Rentabilidad</span>
              <span className="text-right">Peso</span>
              <span />
            </div>

            {Array.from(fundsByType.values())
              .filter((group) => group.funds.length > 0)
              .map(({ type, funds: typeFunds }) => {
                return (
                  <section key={type.id} aria-label={type.name} className="space-y-1.5">
                    {/* A plain label: group totals were noise next to the per-position figures. */}
                    <h3 className="truncate px-3 text-sm font-bold text-foreground">{type.name}</h3>

                    <div className="space-y-1.5 xl:space-y-0">
                      {typeFunds.map((fund) => {
                        const displayReturn = getDisplayReturn(fund);
                        const displayValue = fund.invested_amount + displayReturn;
                        const code = fund.ticker || fund.isin;
                        const color = colors.get(fund.id);
                        const menu = (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={`Acciones de ${fund.name}`}
                              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:h-8 xl:w-8"
                            >
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
                        );

                        // Nothing in it (yet, or any more): one quiet line instead of a full card.
                        if (positionValue(fund) === 0) {
                          return (
                            <div key={fund.id} className={cn("flex items-center gap-2.5 px-3 text-muted-foreground", TABLE_COLS)}>
                              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full border border-muted-foreground/50" />
                                <span className="truncate text-sm">{fund.name}</span>
                              </div>
                              <span className="shrink-0 text-xs xl:col-span-4 xl:text-right">Sin posición</span>
                              {menu}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={fund.id}
                            className={cn(
                              "flex items-start gap-2.5 rounded-xl border border-border/60 bg-card py-2.5 pl-3 pr-1.5 transition-colors xl:rounded-lg xl:border-transparent xl:bg-transparent xl:px-3 xl:py-1 xl:hover:bg-muted/35",
                              TABLE_COLS
                            )}
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-2.5 xl:items-center">
                              {/* Same colour as this position's slice in the distribution chart. */}
                              <span
                                aria-hidden
                                className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full xl:mt-0"
                                style={{ backgroundColor: color }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-medium text-foreground">{fund.name}</p>
                                {code && (
                                  <p className="hidden truncate font-mono text-[10px] text-muted-foreground/80 xl:block">{code}</p>
                                )}
                                {/* Narrow screens: the figures flow under the name and wrap if they must. */}
                                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 xl:hidden">
                                  <span className="text-[15px] font-semibold tabular-nums">
                                    <Amount value={displayValue} />
                                  </span>
                                  <ReturnText
                                    amount={displayReturn}
                                    pct={getReturnPct(fund.invested_amount, displayValue)}
                                    className="text-xs font-medium"
                                  />
                                </p>
                                <p className="text-xs text-muted-foreground xl:hidden">
                                  Invertido <Amount value={fund.invested_amount} /> · {formatWeight(positionValue(fund), portfolioValue)} de la cartera
                                </p>
                              </div>
                            </div>
                            <span className="hidden text-right text-sm tabular-nums text-muted-foreground xl:block">
                              <Amount value={fund.invested_amount} />
                            </span>
                            <span className="hidden text-right text-[15px] font-semibold tabular-nums xl:block">
                              <Amount value={displayValue} />
                            </span>
                            <ReturnText
                              amount={displayReturn}
                              pct={getReturnPct(fund.invested_amount, displayValue)}
                              className="hidden text-right text-sm font-medium xl:block"
                            />
                            <span className="hidden text-right text-sm tabular-nums text-muted-foreground xl:block">
                              {formatWeight(positionValue(fund), portfolioValue)}
                            </span>
                            {menu}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
          </>
        )}
      </div>

      {/* Fund create/edit dialog */}
      <Dialog open={fundOpen} onOpenChange={(v) => { setFundOpen(v); if (!v) setEditingFund(null); }}>
        <DialogContent variant="sheet" className="sm:max-w-lg">
          <DialogHeader variant="bar">
            <DialogTitle>{editingFund ? "Editar fondo" : "Nuevo fondo"}</DialogTitle>
          </DialogHeader>
          <form
            key={editingFund?.id ?? "new"}
            onSubmit={(e) => { e.preventDefault(); if (loading) return; handleFundSubmit(new FormData(e.currentTarget)); }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
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

            <div className="space-y-2">
              <Label htmlFor="type_id">Tipo de inversión</Label>
              <select
                id="type_id"
                name="type_id"
                defaultValue={editingFund?.type_id ?? (types.length === 1 ? types[0].id : "")}
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>Selecciona tipo</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

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
            </div>

            <div className="space-y-2">
              <Label htmlFor="fund_ticker">
                Ticker <span className="text-muted-foreground font-normal">(opcional — para acciones)</span>
              </Label>
              <Input
                id="fund_ticker"
                name="ticker"
                defaultValue={editingFund?.ticker ?? ""}
                placeholder="Ej: ITX.MC, AAPL, SAN.MC"
                maxLength={20}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Símbolo Yahoo Finance. Si hay ticker, se usa en vez del ISIN para actualizar el precio
              </p>
            </div>

            {!editingFund && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="initial_amount">Inversión inicial</Label>
                  <AmountInput
                    id="initial_amount"
                    name="initial_amount"
                    step="0.01"
                    min="0"
                    defaultValue=""
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initial_units">
                    Participaciones <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="initial_units"
                    name="units"
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    defaultValue=""
                    placeholder="Ej: 471.549"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial_price">
                    Precio compra (€/part.) <span className="text-muted-foreground font-normal">(opcional)</span>
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
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">

            <Button type="submit" className="h-12 w-full md:h-10" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : editingFund ? "Actualizar" : "Crear"}
            </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Profitability edit dialog */}
      <Dialog open={profitOpen} onOpenChange={(v) => { setProfitOpen(v); if (!v) setProfitFund(null); }}>
        <DialogContent variant="sheet" className="sm:max-w-sm">
          <DialogHeader variant="bar">
            <DialogTitle>Editar rentabilidad · {profitFund?.name}</DialogTitle>
          </DialogHeader>
          <form
            key={profitFund?.id ?? "profit"}
            onSubmit={(e) => { e.preventDefault(); if (loading) return; handleProfitSubmit(new FormData(e.currentTarget)); }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="space-y-2">
              <Label>Invertido</Label>
              <p className="flex h-10 items-center text-lg font-semibold tabular-nums text-muted-foreground">
                {profitFund ? <Amount value={profitFund.invested_amount} /> : "—"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profit_return">Rentabilidad</Label>
              <AmountInput
                id="profit_return"
                name="return_amount"
                step="0.01"
                defaultValue={profitFund ? Math.round((profitFund.current_value - profitFund.invested_amount) * 100) / 100 : 0}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Ganancia o pérdida del fondo. Ej: 12.50 si has ganado 12,50€
              </p>
            </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
            <Button type="submit" className="h-12 w-full md:h-10" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : "Actualizar"}
            </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution create/edit dialog */}
      <Dialog open={contribOpen} onOpenChange={(v) => { setContribOpen(v); if (!v) { setContribFund(null); setEditingContrib(null); } }}>
        <DialogContent variant="sheet" className="sm:max-w-md">
          <DialogHeader variant="bar">
            <DialogTitle>{editingContrib ? "Editar aportación" : "Nueva aportación"} · {contribFund?.name}</DialogTitle>
          </DialogHeader>
          <form
            key={editingContrib?.id ?? contribFund?.id ?? "contrib"}
            onSubmit={(e) => { e.preventDefault(); if (loading) return; handleContribSubmit(new FormData(e.currentTarget)); }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <input type="hidden" name="fund_id" value={contribFund?.id || ""} />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contrib_amount">Importe</Label>
                <AmountInput
                  id="contrib_amount"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  defaultValue={editingContrib?.amount ?? ""}
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
              <Label htmlFor="contrib_units">
                Participaciones <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="contrib_units"
                name="units"
                type="number"
                step="0.000001"
                min="0.000001"
                defaultValue={editingContrib?.units ?? ""}
                placeholder="Ej: 471.549"
              />
              <p className="text-xs text-muted-foreground">
                Número exacto de participaciones según el broker
              </p>
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
                Precio NAV en la fecha de compra. Si introduces participaciones, se usa directamente ese valor
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
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
            <Button type="submit" className="h-12 w-full md:h-10" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : editingContrib ? "Actualizar" : "Registrar aportación"}
            </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution history dialog */}
      <Dialog open={historyOpen} onOpenChange={(v) => { setHistoryOpen(v); if (!v) setHistoryFund(null); }}>
        <DialogContent variant="sheet" className="sm:max-w-md">
          <DialogHeader variant="bar">
            <DialogTitle>Historial · {historyFund?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[60vh]">
            {historyLoading ? (
              <div className="space-y-2 py-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-2">
                    <div className="space-y-1.5">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-3 w-8 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : contributions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Sin aportaciones registradas</p>
            ) : (
              <div className="space-y-1">
                {contributions.map((c) => {
                  const displayUnits = c.units && c.units > 0
                    ? c.units
                    : (c.purchase_price && c.purchase_price > 0 ? c.amount / c.purchase_price : null);
                  return (
                    <div key={c.id} className="group flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-muted/35">
                      <div>
                        <p className="text-sm font-medium tabular-nums"><Amount value={c.amount} /></p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.contribution_date).toLocaleDateString("es-ES")}
                          {c.purchase_price && (
                            <span className="ml-1 font-mono">@ {c.purchase_price}€</span>
                          )}
                          {displayUnits !== null && (
                            <span className="ml-1 opacity-70">= {displayUnits.toFixed(4)} part.</span>
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
          </DialogBody>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
