"use client";

import { useState } from "react";
import { Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { importMensualesOds } from "@/actions/import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type Props = Record<string, never>;

type ImportResponse = {
  error?: string;
  success?: number;
  skipped?: number;
  totalDetected?: number;
  message?: string;
};

export function ImportOdsForm({}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.set("file", file);
    if (year.trim()) {
      formData.set("year", year.trim());
    }

    const res = (await importMensualesOds(formData)) as ImportResponse;
    setResult(res);
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Fichero ODS</Label>
        <Input
          id="file"
          type="file"
          accept=".ods"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="cursor-pointer"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="year">Año (opcional)</Label>
          <Input
            id="year"
            type="number"
            min={2000}
            max={2100}
            placeholder="Ej: 2025"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Importa movimientos diarios desde la tabla grande de Mensuales.ods (día/mes + importe + comentario en celda).
        Si indicas año, solo se importa ese bloque. La categoría se asigna automáticamente por comentario
        (si no hay coincidencia, usa &quot;Otros&quot; o la primera categoría disponible).
      </p>

      <Button type="submit" className="w-full" disabled={loading || !file}>
        <Upload className="mr-2 h-4 w-4" />
        {loading ? "Importando..." : "Importar desde ODS"}
      </Button>

      {result?.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Error de importación
          </div>
          <p className="mt-1">{result.error}</p>
        </div>
      )}

      {!result?.error && typeof result?.success === "number" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Importación completada
          </div>
          <p className="mt-1">
            Detectados: {result.totalDetected ?? 0} · Importados: {result.success} · Omitidos: {result.skipped ?? 0}
          </p>
          {result.message && <p className="mt-1">{result.message}</p>}
        </div>
      )}
    </form>
  );
}
