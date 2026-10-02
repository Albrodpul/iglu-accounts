"use client";

import { useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Amount } from "@/components/ui/amount";
import { AmountInput } from "@/components/ui/amount-input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SwipeRow } from "@/components/ui/swipe-row";
import { formatCurrency, formatDate, formatDecimal, formatPercent } from "@/lib/format";
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contribution_date">Fecha</Label>
          <Input
            id="contribution_date"
            name="contribution_date"
            type="date"
            defaultValue={contribution?.contribution_date ?? today}
            required
          />
        </div>
        <UnitsPriceFields
          idPrefix="contrib"
          amount={amount}
          defaultUnits={contribution?.units ?? null}
          defaultPrice={contribution?.purchase_price ?? null}
        />
        <div className="space-y-2">
          <Label htmlFor="contrib_notes">Notas (opcional)</Label>
          <Input id="contrib_notes" name="notes" defaultValue={contribution?.notes ?? ""} />
        </div>
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
}: {
  contributions: InvestmentContribution[];
  loading: boolean;
  onEdit: (contribution: InvestmentContribution) => void;
  onDelete: (contribution: InvestmentContribution) => void;
}) {
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
  const totalUnits = units.every((u) => u !== null) ? units.reduce<number>((sum, u) => sum + (u ?? 0), 0) : null;

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Aportado</dt>
          <dd className="font-semibold tabular-nums">
            <Amount value={total} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Aportaciones</dt>
          <dd className="font-semibold tabular-nums">{contributions.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Participaciones</dt>
          <dd className="font-semibold tabular-nums">{totalUnits === null ? "—" : formatDecimal(totalUnits)}</dd>
        </div>
      </dl>

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
                    {bought !== null && ` · ${formatDecimal(bought)} participaciones`}
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
