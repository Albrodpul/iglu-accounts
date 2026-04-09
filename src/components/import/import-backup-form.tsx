"use client";

import { useState } from "react";
import { Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { importBackup } from "@/actions/import-backup";
import type { ImportBackupResult } from "@/actions/import-backup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImportBackupForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportBackupResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.set("file", file);

    const res = await importBackup(formData);
    setResult(res);
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="backup-file">Fichero de copia de seguridad (.json)</Label>
        <Input
          id="backup-file"
          type="file"
          accept=".json"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="cursor-pointer"
          required
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Importa una copia de seguridad generada desde &quot;Exportar&quot;. Las categorías se crean si no
        existen. Los movimientos, recurrentes e inversiones ya presentes se omiten para evitar
        duplicados.
      </p>

      <Button type="submit" className="w-full" disabled={loading || !file}>
        <Upload className="mr-2 h-4 w-4" />
        {loading ? "Importando..." : "Restaurar copia de seguridad"}
      </Button>

      {result?.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Error de importación
          </div>
          <p className="mt-1">{result.error}</p>
        </div>
      )}

      {!result?.error && result?.expenses && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
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
                Recurrentes: {result.recurring?.imported} importados, {result.recurring?.skipped}{" "}
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
