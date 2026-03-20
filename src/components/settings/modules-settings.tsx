"use client";

import { useState } from "react";
import { toggleInvestments } from "@/actions/accounts";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";

type Props = {
  hasInvestments: boolean;
};

export function ModulesSettings({ hasInvestments }: Props) {
  const [enabled, setEnabled] = useState(hasInvestments);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const newValue = !enabled;
    const result = await toggleInvestments(newValue);
    if (result?.error) {
      toast.error(result.error);
    } else {
      setEnabled(newValue);
      toast.success(newValue ? "Módulo de inversiones activado" : "Módulo de inversiones desactivado");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Activa o desactiva módulos opcionales para esta cuenta
      </p>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
            <TrendingUp className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[15px] font-semibold">Inversiones</p>
            <p className="text-sm text-muted-foreground">
              Control de fondos, rentabilidades y desglose de activos
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={loading}
          onClick={handleToggle}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
            enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
