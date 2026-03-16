"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importExpenses } from "@/actions/import";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import type { Category } from "@/types";

type Props = {
  categories: Category[];
};

type ImportResult = {
  success: number;
  errors: string[];
};

export function ImportForm({ categories }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());

    // Skip header if present
    const startIdx = lines[0].toLowerCase().includes("fecha") ? 1 : 0;

    const categoryMap = new Map(
      categories.map((c) => [c.name.toLowerCase(), c.id])
    );

    let success = 0;
    const errors: string[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV (handle commas in quoted fields)
      const parts = parseCsvLine(line);

      if (parts.length < 3) {
        errors.push(`Línea ${i + 1}: formato incorrecto (se esperan al menos 3 columnas)`);
        continue;
      }

      const [dateStr, amountStr, concept, categoryName] = parts;

      // Validate date
      const dateMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
      if (!dateMatch) {
        errors.push(`Línea ${i + 1}: fecha inválida "${dateStr}" (usar AAAA-MM-DD)`);
        continue;
      }

      // Validate amount
      const amount = parseFloat(amountStr.replace(",", "."));
      if (isNaN(amount) || amount === 0) {
        errors.push(`Línea ${i + 1}: importe inválido "${amountStr}"`);
        continue;
      }

      // Find category
      const catName = (categoryName || "Otros").trim().toLowerCase();
      let categoryId = categoryMap.get(catName);
      if (!categoryId) {
        // Try partial match
        for (const [name, id] of categoryMap) {
          if (name.includes(catName) || catName.includes(name)) {
            categoryId = id;
            break;
          }
        }
      }
      if (!categoryId) {
        categoryId = categoryMap.get("otros");
      }
      if (!categoryId) {
        errors.push(`Línea ${i + 1}: categoría "${categoryName}" no encontrada`);
        continue;
      }

      const formData = new FormData();
      formData.set("amount", String(Math.abs(amount)));
      formData.set("is_income", String(amount > 0));
      formData.set("concept", concept.trim());
      formData.set("category_id", categoryId);
      formData.set("expense_date", dateStr);

      const res = await importExpenses(formData);
      if (res?.error) {
        errors.push(`Línea ${i + 1}: ${res.error}`);
      } else {
        success++;
      }
    }

    setResult({ success, errors });
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="file"
        accept=".csv,.txt"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="cursor-pointer"
      />

      <Button type="submit" disabled={!file || loading} className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {loading ? "Importando..." : "Importar"}
      </Button>

      {result && (
        <div className="space-y-2">
          {result.success > 0 && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {result.success} movimientos importados correctamente
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {result.errors.length} errores
              </div>
              <ul className="list-disc list-inside text-xs space-y-0.5 max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === "," || char === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
