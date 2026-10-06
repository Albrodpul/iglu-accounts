"use client";

import { useState } from "react";
import { Upload, AlertTriangle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { importBackup } from "@/actions/import-backup";
import type { ImportBackupResult } from "@/actions/import-backup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImportBackupForm({ accountName }: { accountName: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportBackupResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      setResult(null);

      const formData = new FormData();
      formData.set("file", file);

      const res = await importBackup(formData);
      setResult(res);
    } catch {
      setResult({ error: "No se pudo importar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* The copy lands in whichever account is active: say which, before anything is sent. */}
      {accountName && (
        <p className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
          <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            Se importará en la cuenta <strong className="font-semibold">{accountName}</strong>
          </span>
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="backup-file">Fichero de copia de seguridad (.json)</Label>
        <Input
          id="backup-file"
          type="file"
          accept=".json"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="h-11 cursor-pointer md:h-10"
          required
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Las categorías que falten se crean. Los movimientos, movimientos fijos e inversiones que ya
        existan se omiten, así que importar dos veces la misma copia no duplica nada.
      </p>

      <Button type="submit" className="h-12 w-full md:h-10" disabled={loading || !file}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {loading ? "Importando..." : "Restaurar copia"}
      </Button>

      {result?.error && (
        <div role="alert" className="rounded-lg border border-expense/30 bg-expense/10 p-3 text-sm text-expense">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Error de importación
          </div>
          <p className="mt-1">{result.error}</p>
        </div>
      )}

      {!result?.error && result?.expenses && (
        <div role="status" className="rounded-lg border border-income/30 bg-income/10 p-3 text-sm text-income">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Importación completada
          </div>
          <ul className="mt-2 space-y-0.5 text-xs">
            <li>
              Categorías: {result.categories?.imported} nuevas, {result.categories?.existing} ya
              existían
            </li>
            <li>
              Movimientos: {result.expenses.imported} importados, {result.expenses.skipped} omitidos
            </li>
            {(result.recurring?.imported ?? 0) + (result.recurring?.skipped ?? 0) > 0 && (
              <li>
                Movimientos fijos: {result.recurring?.imported} importados, {result.recurring?.skipped}{" "}
                omitidos
              </li>
            )}
            {result.investments &&
              result.investments.types + result.investments.funds + result.investments.contributions >
                0 && (
                <li>
                  Inversiones: {result.investments.types} tipos, {result.investments.funds} fondos,{" "}
                  {result.investments.contributions} aportaciones
                </li>
              )}
          </ul>
        </div>
      )}
    </form>
  );
}
