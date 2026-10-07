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
import { Plus, Pencil, Trash2, History, TrendingUp, MoreVertical, Percent, Loader2, ChevronDown, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ContributionForm, ContributionHistory, ProfitabilityForm, UnitsPriceFields } from "./fund-forms";
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

type SortKey = "name" | "invested" | "value" | "return" | "weight";

const SORT_COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Posición", align: "left" },
  { key: "invested", label: "Invertido", align: "right" },
  { key: "value", label: "Valor", align: "right" },
  { key: "return", label: "Rentabilidad", align: "right" },
  { key: "weight", label: "Peso", align: "right" },
];

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
  const [initialAmount, setInitialAmount] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean } | null>(null);
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
    setInitialAmount(null);
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

  // Grouped by type unless a column is sorted: then one flat list, so the
  // order really is by that figure across the whole portfolio.
  const sortValue: Record<SortKey, (fund: InvestmentFundWithType) => number | string> = {
    name: (fund) => fund.name.toLocaleLowerCase("es"),
    invested: (fund) => fund.invested_amount,
    value: (fund) => fund.invested_amount + getDisplayReturn(fund),
    return: (fund) => getDisplayReturn(fund),
    weight: (fund) => positionValue(fund),
  };
  const groups: { key: string; label: string | null; funds: InvestmentFundWithType[] }[] = sort
    ? [
        {
          key: "sorted",
          label: null,
          funds: [...funds].sort((a, b) => {
            const [x, y] = [sortValue[sort.key](a), sortValue[sort.key](b)];
            const order = typeof x === "string" ? x.localeCompare(y as string, "es") : (x as number) - (y as number);
            return sort.ascending ? order : -order;
          }),
        },
      ]
    : Array.from(fundsByType.values())
        .filter((group) => group.funds.length > 0)
        .map(({ type, funds: typeFunds }) => ({ key: type.id, label: type.name, funds: typeFunds }));

  /** Header click: sort by that column, flip the direction, then back to grouping by type. */
  function cycleSort(key: SortKey) {
    const startsAscending = key === "name";
    setSort((current) =>
      current?.key !== key
        ? { key, ascending: startsAscending }
        : current.ascending === startsAscending
          ? { key, ascending: !startsAscending }
          : null,
    );
  }

  function renderFund(fund: InvestmentFundWithType) {
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
            {sort ? (
                  <p className="hidden truncate text-[11px] text-muted-foreground xl:block">{fund.investment_type.name}</p>
                ) : (
                  code && <p className="hidden truncate font-mono text-[10px] text-muted-foreground/80 xl:block">{code}</p>
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
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2 className="text-lg font-semibold md:text-xl">Posiciones</h2>
            {sort && (
              <button
                type="button"
                onClick={() => setSort(null)}
                className="hidden cursor-pointer text-xs font-medium text-primary hover:underline xl:block"
              >
                Volver a agrupar por tipo
              </button>
            )}
          </div>
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
              {SORT_COLUMNS.map((column) => {
                const active = sort?.key === column.key;
                const Arrow = active ? (sort.ascending ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => cycleSort(column.key)}
                    aria-pressed={active}
                    title={active ? "Cambiar el sentido o volver a agrupar por tipo" : `Ordenar por ${column.label.toLowerCase()}`}
                    className={cn(
                      "group/sort flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground",
                      column.align === "right" && "justify-end",
                      active && "text-foreground"
                    )}
                  >
                    {column.label}
                    <Arrow className={cn("h-3 w-3", !active && "opacity-0 group-hover/sort:opacity-60")} />
                  </button>
                );
              })}
              <span />
            </div>

            {groups.map((group) => {
                return (
                  <section key={group.key} aria-label={group.label ?? "Posiciones ordenadas"} className="space-y-1.5">
                    {/* A plain label: group totals were noise next to the per-position figures. */}
                    {group.label && <h3 className="truncate px-3 text-sm font-bold text-foreground">{group.label}</h3>}

                    <div className="space-y-1.5 xl:space-y-0">
                      {group.funds.map(renderFund)}
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
                // 16px on phones: smaller text makes iOS zoom the page on focus.
                className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:text-sm"
              >
                <option value="" disabled>Selecciona tipo</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {!editingFund && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="initial_amount">Inversión inicial</Label>
                  <AmountInput
                    id="initial_amount"
                    name="initial_amount"
                    step="0.01"
                    min="0"
                    defaultValue=""
                    onValueChange={setInitialAmount}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contrib_date">Fecha</Label>
                  <Input id="contrib_date" name="contribution_date" type="date" defaultValue={today} required />
                </div>
                <UnitsPriceFields idPrefix="initial" amount={initialAmount} />
              </>
            )}

            {/* Only needed for the automatic price refresh, so it stays out of the way. */}
            <details className="group rounded-lg border border-border/60" open={Boolean(editingFund?.isin || editingFund?.ticker)}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <span>
                  Actualización automática del precio{" "}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-4 border-t border-border/60 px-3 py-3">
                <div className="space-y-2">
                  <Label htmlFor="fund_isin">ISIN (fondos)</Label>
                  <Input
                    id="fund_isin"
                    name="isin"
                    defaultValue={editingFund?.isin ?? ""}
                    placeholder="Ej: LU0080237943"
                    maxLength={12}
                    autoCapitalize="characters"
                    className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fund_ticker">Ticker (acciones y ETF)</Label>
                  <Input
                    id="fund_ticker"
                    name="ticker"
                    defaultValue={editingFund?.ticker ?? ""}
                    placeholder="Ej: ITX.MC, AAPL"
                    maxLength={20}
                    autoCapitalize="characters"
                    className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                  />
                  <p className="text-xs text-muted-foreground">
                    Símbolo de Yahoo Finance. Si lo rellenas, se usa en lugar del ISIN.
                  </p>
                </div>
              </div>
            </details>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-3">
              <div>
                <p id="show-negative-label" className="text-sm font-medium">Reflejar pérdidas</p>
                <p className="text-xs text-muted-foreground">Si lo desactivas, una pérdida se muestra como 0 €.</p>
              </div>
              <ToggleSwitch
                enabled={showNegative}
                onToggle={() => setShowNegative((value) => !value)}
                aria-labelledby="show-negative-label"
              />
            </div>
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
        <DialogContent variant="menu" className="sm:max-w-sm">
          <DialogHeader variant="bar">
            <DialogTitle>Rentabilidad · {profitFund?.name}</DialogTitle>
          </DialogHeader>
          {profitFund && (
            <ProfitabilityForm key={profitFund.id} fund={profitFund} loading={loading} onSubmit={handleProfitSubmit} />
          )}
        </DialogContent>
      </Dialog>

      {/* Contribution create/edit dialog */}
      <Dialog open={contribOpen} onOpenChange={(v) => { setContribOpen(v); if (!v) { setContribFund(null); setEditingContrib(null); } }}>
        <DialogContent variant="sheet" className="sm:max-w-md">
          <DialogHeader variant="bar">
            <DialogTitle>{editingContrib ? "Editar aportación" : "Nueva aportación"} · {contribFund?.name}</DialogTitle>
          </DialogHeader>
          <ContributionForm
            key={editingContrib?.id ?? contribFund?.id ?? "contrib"}
            fund={contribFund}
            contribution={editingContrib}
            today={today}
            loading={loading}
            onSubmit={handleContribSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Contribution history dialog */}
      <Dialog open={historyOpen} onOpenChange={(v) => { setHistoryOpen(v); if (!v) setHistoryFund(null); }}>
        <DialogContent variant="sheet" className="sm:max-w-md">
          <DialogHeader variant="bar">
            <DialogTitle>Historial · {historyFund?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[60vh]">
            <ContributionHistory
              contributions={contributions}
              loading={historyLoading}
              onEdit={(c) => historyFund && openEditContribution(c, historyFund)}
              onDelete={handleDeleteContribution}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
