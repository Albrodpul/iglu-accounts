"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";
import { checkPriceSource } from "@/actions/investments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Amount, usePrivacy } from "@/components/ui/amount";
import { AmountInput } from "@/components/ui/amount-input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SwipeRow } from "@/components/ui/swipe-row";
import { formatCurrency, formatDate, formatDecimal, formatPercent } from "@/lib/format";
import { daysAgo, toLocalISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { InvestmentContribution, InvestmentFundWithType } from "@/types";

const footerClass =
  "flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4";
const bodyClass = "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4";

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" className="h-12 w-full md:h-10" disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? "Guardando..." : children}
    </Button>
  );
}

/** Date field with one-tap "Hoy" / "Ayer", as in the movement form. */
export function QuickDateField({ id, name, defaultValue }: { id: string; name: string; defaultValue: string }) {
  const [date, setDate] = useState(defaultValue);
  const today = toLocalISODate();
  const yesterday = toLocalISODate(daysAgo(1));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>Fecha</Label>
        <div className="flex gap-1.5" role="group" aria-label="Fecha rápida">
          {[
            { label: "Hoy", value: today },
            { label: "Ayer", value: yesterday },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              aria-pressed={date === chip.value}
              onClick={() => setDate(chip.value)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                date === chip.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
      <Input id={id} name={name} type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-12 md:h-10" />
    </div>
  );
}

/**
 * ISIN and ticker for the automatic price, with a "Comprobar" that asks the
 * source right away: a typo shows up here, not as a fund that never updates.
 */
export function PriceSourceFields({ defaultIsin, defaultTicker }: { defaultIsin: string; defaultTicker: string }) {
  const [isin, setIsin] = useState(defaultIsin);
  const [ticker, setTicker] = useState(defaultTicker);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof checkPriceSource>> | null>(null);

  async function check() {
    setChecking(true);
    setResult(null);
    try {
      setResult(await checkPriceSource({ isin, ticker }));
    } catch {
      setResult({ found: false, source: null, error: "No se pudo consultar ahora. Prueba más tarde." });
    } finally {
      setChecking(false);
    }
  }

  const sourceName = (source: "isin" | "ticker" | null) => (source === "ticker" ? "Yahoo Finance" : "fundinfo");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fund_isin">ISIN (fondos)</Label>
        <Input
          id="fund_isin"
          name="isin"
          value={isin}
          onChange={(e) => { setIsin(e.target.value); setResult(null); }}
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
          value={ticker}
          onChange={(e) => { setTicker(e.target.value); setResult(null); }}
          placeholder="Ej: ITX.MC, AAPL"
          maxLength={20}
          autoCapitalize="characters"
          className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
        />
        <p className="text-xs text-muted-foreground">Símbolo de Yahoo Finance. Si lo rellenas, se usa en lugar del ISIN.</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button type="button" variant="outline" size="sm" onClick={check} disabled={checking || !(isin.trim() || ticker.trim())}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Comprobar
        </Button>
        <p aria-live="polite" className="min-w-0 flex-1 text-xs">
          {result?.found && (
            <span className="flex items-center gap-1.5 text-income">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {formatDecimal(result.price)} €{result.date && ` · precio del ${formatDate(result.date)}`} ({sourceName(result.source)})
              </span>
            </span>
          )}
          {result && !result.found && (
            <span className="flex items-center gap-1.5 text-expense">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{result.error}</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/** Notes folded behind "+ Añadir nota" until wanted (open when there already is one). */
function FoldedNotes({ id, defaultValue }: { id: string; defaultValue: string }) {
  const [open, setOpen] = useState(Boolean(defaultValue));
  const inputRef = useRef<HTMLInputElement>(null);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="flex h-9 cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="h-4 w-4" />
        Añadir nota
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Notas (opcional)</Label>
      <Input id={id} ref={inputRef} name="notes" defaultValue={defaultValue} />
    </div>
  );
}

/**
 * Units bought and price paid per unit, both optional. With the amount and one
 * of them the other follows, so it is shown instead of asking for it.
 */
export function UnitsPriceFields({
  amount,
  idPrefix,
  defaultUnits = null,
  defaultPrice = null,
}: {
  amount: number | null;
  idPrefix: string;
  defaultUnits?: number | null;
  defaultPrice?: number | null;
}) {
  const [units, setUnits] = useState<number | null>(defaultUnits);
  const [price, setPrice] = useState<number | null>(defaultPrice);

  const hasAmount = amount !== null && amount > 0;
  let hint = "Opcionales. Con el importe y uno de los dos, el otro se calcula solo.";
  if (hasAmount && price && !units) hint = `≈ ${formatDecimal(amount / price)} participaciones`;
  else if (hasAmount && units && !price) hint = `≈ ${formatDecimal(amount / units)} € por participación`;
  else if (hasAmount && units && price && Math.abs(units * price - amount) > Math.max(0.01, amount * 0.01)) {
    hint = `Participaciones × precio son ${formatCurrency(units * price)}, no ${formatCurrency(amount)}. Revisa los datos.`;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}_units`}>Participaciones</Label>
          <DecimalInput
            id={`${idPrefix}_units`}
            name="units"
            min="0.000001"
            defaultValue={defaultUnits}
            onValueChange={setUnits}
            placeholder="Ej: 471,549"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}_price`}>Precio (€/part.)</Label>
          <DecimalInput
            id={`${idPrefix}_price`}
            name="purchase_price"
            min="0.000001"
            defaultValue={defaultPrice}
            onValueChange={setPrice}
            placeholder="Ej: 12,72"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">{hint}</p>
    </div>
  );
}

export function ContributionForm({
  fund,
  contribution,
  today,
  loading,
  onSubmit,
}: {
  fund: InvestmentFundWithType | null;
  contribution: InvestmentContribution | null;
  today: string;
  loading: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  const [amount, setAmount] = useState<number | null>(contribution?.amount ?? null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onSubmit(new FormData(e.currentTarget));
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className={bodyClass}>
        <input type="hidden" name="fund_id" value={fund?.id || ""} />
        <div className="space-y-2">
          <Label htmlFor="contrib_amount">Importe</Label>
          <AmountInput
            id="contrib_amount"
            name="amount"
            step="0.01"
            min="0.01"
            defaultValue={contribution?.amount ?? ""}
            onValueChange={setAmount}
            required
            size="lg"
          />
        </div>
        <QuickDateField id="contribution_date" name="contribution_date" defaultValue={contribution?.contribution_date ?? today} />
        <UnitsPriceFields
          idPrefix="contrib"
          amount={amount}
          defaultUnits={contribution?.units ?? null}
          defaultPrice={contribution?.purchase_price ?? null}
        />
        <FoldedNotes id="contrib_notes" defaultValue={contribution?.notes ?? ""} />
      </div>
      <div className={footerClass}>
        <SubmitButton loading={loading}>{contribution ? "Actualizar" : "Registrar aportación"}</SubmitButton>
      </div>
    </form>
  );
}

/**
 * Sets a fund's gain or loss. The sign is a choice, not a typed "-" (phone
 * numeric keypads often lack it), and the resulting value shows live so the
 * figure isn't entered blind.
 */
export function ProfitabilityForm({
  fund,
  loading,
  onSubmit,
}: {
  fund: InvestmentFundWithType;
  loading: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  const current = Math.round((fund.current_value - fund.invested_amount) * 100) / 100;
  const [direction, setDirection] = useState<"gain" | "loss">(current < 0 ? "loss" : "gain");
  const [magnitude, setMagnitude] = useState<number | null>(Math.abs(current));

  const signed = magnitude === null ? null : direction === "loss" ? -magnitude : magnitude;
  const value = signed === null ? null : fund.invested_amount + signed;
  const pct = signed === null || fund.invested_amount === 0 ? null : (signed / fund.invested_amount) * 100;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onSubmit(new FormData(e.currentTarget));
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className={bodyClass}>
        <input type="hidden" name="return_amount" value={signed ?? ""} />
        {(fund.isin || fund.ticker) && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-500/12 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Este fondo se actualiza solo cada hora con su {fund.ticker ? "ticker" : "ISIN"}: lo que pongas aquí se
              sustituirá en la próxima actualización. Para fijarlo a mano, quita el {fund.ticker ? "ticker" : "ISIN"} en «Editar fondo».
            </span>
          </p>
        )}
        <SegmentedControl
          aria-label="Ganancia o pérdida"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "gain", label: "Ganancia", tone: "income" },
            { value: "loss", label: "Pérdida", tone: "expense" },
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="profit_return">{direction === "loss" ? "Pérdida acumulada" : "Ganancia acumulada"}</Label>
          <AmountInput
            id="profit_return"
            step="0.01"
            min="0"
            defaultValue={Math.abs(current)}
            onValueChange={setMagnitude}
            tone={direction === "loss" ? "expense" : "income"}
            required
            autoFocus
          />
        </div>
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Invertido</dt>
            <dd className="font-semibold tabular-nums">
              <Amount value={fund.invested_amount} />
            </dd>
          </div>
          <div aria-live="polite">
            <dt className="text-xs text-muted-foreground">Valor resultante</dt>
            <dd className="font-semibold tabular-nums">
              {value === null ? "—" : <Amount value={value} />}
              {pct !== null && (
                <span
                  className={cn(
                    "ml-1.5 text-xs font-medium",
                    pct > 0 ? "text-income" : pct < 0 ? "text-expense" : "text-muted-foreground"
                  )}
                >
                  {formatPercent(pct, { signed: true })}
                </span>
              )}
            </dd>
          </div>
        </dl>
        {direction === "loss" && !fund.show_negative_returns && (
          <p className="text-xs text-muted-foreground">
            Este fondo tiene desactivado «Reflejar pérdidas»: en la lista se mostrará con 0 € de rentabilidad.
          </p>
        )}
      </div>
      <div className={footerClass}>
        <SubmitButton loading={loading}>Actualizar</SubmitButton>
      </div>
    </form>
  );
}

/** Units of a contribution: the recorded ones, or what the amount bought at its price. */
function unitsOf(c: InvestmentContribution): number | null {
  if (c.units && c.units > 0) return c.units;
  if (c.purchase_price && c.purchase_price > 0) return c.amount / c.purchase_price;
  return null;
}

export function ContributionHistory({
  contributions,
  loading,
  onEdit,
  onDelete,
  value,
}: {
  contributions: InvestmentContribution[];
  loading: boolean;
  onEdit: (contribution: InvestmentContribution) => void;
  onDelete: (contribution: InvestmentContribution) => void;
  /** The position's value now, as shown in the list: adds value and return to the summary. */
  value?: number;
}) {
  const privacy = usePrivacy();
  if (loading) {
    return (
      <div className="space-y-3 py-1" aria-hidden>
        <div className="h-16 animate-pulse rounded-lg bg-muted/60" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5 px-2 py-1">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (contributions.length === 0) {
    return <p className="py-4 text-center text-muted-foreground">Sin aportaciones registradas</p>;
  }

  const total = contributions.reduce((sum, c) => sum + c.amount, 0);
  const units = contributions.map(unitsOf);
  // Units times a public price is the amount: hidden along with it.
  const { secret } = privacy;
  const totalUnits = units.every((u) => u !== null) ? units.reduce<number>((sum, u) => sum + (u ?? 0), 0) : null;
  const gain = value === undefined ? null : Math.round((value - total) * 100) / 100;
  const gainPct = gain === null || total === 0 ? null : (gain / total) * 100;

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/50 p-3">
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Aportado</dt>
            <dd className="font-semibold tabular-nums">
              <Amount value={total} />
            </dd>
          </div>
          {value !== undefined && gain !== null && (
            <>
              <div>
                <dt className="text-xs text-muted-foreground">Valor actual</dt>
                <dd className="font-semibold tabular-nums">
                  <Amount value={value} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Rentabilidad</dt>
                <dd
                  className={cn(
                    "font-semibold tabular-nums",
                    gain > 0 ? "text-income" : gain < 0 ? "text-expense" : "text-muted-foreground"
                  )}
                >
                  <Amount value={gain} prefix={gain > 0 ? "+" : ""} />
                  {gainPct !== null && gain !== 0 && (
                    <span className="block text-xs font-medium">{formatPercent(gainPct, { signed: true })}</span>
                  )}
                </dd>
              </div>
            </>
          )}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          {contributions.length} {contributions.length === 1 ? "aportación" : "aportaciones"}
          {totalUnits !== null && ` · ${secret(formatDecimal(totalUnits))} participaciones`}
        </p>
      </div>

      <ul className="space-y-1">
        {contributions.map((c) => {
          const bought = unitsOf(c);
          return (
            <li key={c.id}>
              <SwipeRow
                onTap={() => onEdit(c)}
                onDelete={() => onDelete(c)}
                className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/35"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tabular-nums">
                    <Amount value={c.amount} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(c.contribution_date)}
                    {bought !== null && ` · ${secret(formatDecimal(bought))} participaciones`}
                    {c.purchase_price ? ` a ${formatDecimal(c.purchase_price)} €` : ""}
                  </p>
                  {c.notes && <p className="truncate text-xs text-muted-foreground/80">{c.notes}</p>}
                </div>
                <div className="hidden shrink-0 items-center md:flex md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label="Editar aportación"
                    title="Editar"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar aportación"
                    title="Eliminar"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-expense"
                    onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </SwipeRow>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs text-muted-foreground md:hidden">
        Toca una aportación para editarla o deslízala a la izquierda para borrarla.
      </p>
    </div>
  );
}
