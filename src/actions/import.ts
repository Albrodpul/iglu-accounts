"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSelectedAccountId } from "./accounts";

const importSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
});

type ImportEntry = {
  expense_date: string;
  amount: number;
  concept: string;
};

function parseAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const clean = value.trim();
  if (!clean) return null;

  const normalized = clean
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function getCell(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number
): XLSX.CellObject | undefined {
  return sheet[XLSX.utils.encode_cell({ r: row, c: col })] as XLSX.CellObject | undefined;
}

function getCellComment(cell?: XLSX.CellObject): string {
  const comments = (cell?.c ?? []) as Array<{ t?: string }>;
  const text = comments
    .map((c) => c.t ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function isValidIsoDate(isoDate: string): boolean {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;

  return isoDate === d.toISOString().slice(0, 10);
}

function parseDailyEntriesFromWorkbook(
  workbook: XLSX.WorkBook,
  onlyYear?: number
): ImportEntry[] {
  const entries: ImportEntry[] = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet || !sheet["!ref"]) continue;

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    let currentYear: number | null = null;

    for (let r = range.s.r; r <= range.e.r; r++) {
      // El año aparece en distintas columnas según bloque (p.ej. B o F).
      for (let c = range.s.c; c <= range.e.c; c++) {
        const yearCell = getCell(sheet, r, c);
        const yearValue = parseAmount(yearCell?.v ?? yearCell?.w ?? null);
        if (
          yearValue &&
          Number.isInteger(yearValue) &&
          yearValue >= 2000 &&
          yearValue <= 2100
        ) {
          currentYear = yearValue;
          break;
        }
      }

      const dayOrYearCell = getCell(sheet, r, 5); // Columna F (Día)
      const dayOrYearValue = parseAmount(dayOrYearCell?.v ?? dayOrYearCell?.w ?? null);

      if (!currentYear) continue;
      if (onlyYear && currentYear !== onlyYear) continue;

      if (
        !dayOrYearValue ||
        !Number.isInteger(dayOrYearValue) ||
        dayOrYearValue < 1 ||
        dayOrYearValue > 31
      ) {
        continue;
      }

      const day = dayOrYearValue;

      for (let c = 6; c <= 17; c++) {
        const amountCell = getCell(sheet, r, c);
        if (!amountCell) continue;

        const amount = parseAmount(amountCell.v ?? amountCell.w ?? null);
        if (!amount || amount === 0) continue;

        const month = c - 5;
        const date = `${currentYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (!isValidIsoDate(date)) continue;

        const comment = getCellComment(amountCell);
        const concept =
          comment || (amount > 0 ? "Ingreso importado desde hoja mensual" : "Gasto importado desde hoja mensual");

        entries.push({
          expense_date: date,
          amount,
          concept: concept.slice(0, 200),
        });
      }
    }
  }

  const unique = new Map<string, ImportEntry>();
  for (const e of entries) {
    const key = `${e.expense_date}|${e.amount.toFixed(2)}|${e.concept}`;
    if (!unique.has(key)) {
      unique.set(key, e);
    }
  }

  return Array.from(unique.values()).sort((a, b) =>
    a.expense_date === b.expense_date
      ? a.amount - b.amount
      : a.expense_date.localeCompare(b.expense_date)
  );
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function pickCategoryId(
  entry: ImportEntry,
  categories: { id: string; name: string }[],
  fallbackCategoryId: string
): string {
  const concept = normalizeText(entry.concept);

  if (entry.amount > 0) {
    const incomeCategory = categories.find((c) =>
      /ingres|nomina|sueldo|beneficio/.test(normalizeText(c.name))
    );
    if (incomeCategory) return incomeCategory.id;
  }

  for (const cat of categories) {
    const catName = normalizeText(cat.name);
    if (catName.length < 3) continue;
    if (concept.includes(catName)) return cat.id;
  }

  return fallbackCategoryId;
}

export async function importMensualesOds(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Selecciona un fichero .ods" };
  }

  if (!file.name.toLowerCase().endsWith(".ods")) {
    return { error: "Solo se permite fichero .ods" };
  }

  const yearRaw = String(formData.get("year") ?? "").trim();
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;

  const parsed = importSchema.safeParse({
    year,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos de importación inválidos" };
  }

  const accountId = await getSelectedAccountId();
  if (!accountId) {
    return { error: "No hay cuenta seleccionada" };
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: true });

  if (categoriesError) {
    return { error: categoriesError.message };
  }

  if (!categories || categories.length === 0) {
    return { error: "No hay categorías en la cuenta seleccionada" };
  }

  const fallbackCategory =
    categories.find((c) => /otros|misc|varios|general/i.test(normalizeText(c.name))) ??
    categories[0];

  const bytes = await file.arrayBuffer();
  const workbook = XLSX.read(Buffer.from(bytes), {
    type: "buffer",
  });

  const entries = parseDailyEntriesFromWorkbook(workbook, parsed.data.year);

  if (entries.length === 0) {
    return {
      error:
        "No se encontraron movimientos en el formato esperado (día/mes con importe). Revisa año y estructura.",
    };
  }

  let existingQuery = supabase
    .from("expenses")
    .select("expense_date, amount, concept")
    .eq("user_id", user.id)
    .eq("account_id", accountId);

  if (parsed.data.year) {
    existingQuery = existingQuery
      .gte("expense_date", `${parsed.data.year}-01-01`)
      .lt("expense_date", `${parsed.data.year + 1}-01-01`);
  }

  const { data: existingRows, error: existingError } = await existingQuery;
  if (existingError) {
    return { error: existingError.message };
  }

  const existing = new Set(
    (existingRows ?? []).map(
      (r) => `${r.expense_date}|${Number(r.amount).toFixed(2)}|${String(r.concept ?? "")}`
    )
  );

  const rowsToInsert = entries
    .filter((e) => !existing.has(`${e.expense_date}|${e.amount.toFixed(2)}|${e.concept}`))
    .map((e) => ({
      user_id: user.id,
      account_id: accountId,
      category_id: pickCategoryId(e, categories, fallbackCategory.id),
      amount: e.amount,
      concept: e.concept,
      expense_date: e.expense_date,
      notes: null,
    }));

  if (rowsToInsert.length === 0) {
    return {
      success: 0,
      skipped: entries.length,
      totalDetected: entries.length,
      message: "No se importó nada: todos los movimientos ya existían.",
    };
  }

  const chunkSize = 500;
  for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
    const chunk = rowsToInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from("expenses").insert(chunk);
    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");

  return {
    success: rowsToInsert.length,
    skipped: entries.length - rowsToInsert.length,
    totalDetected: entries.length,
  };
}
