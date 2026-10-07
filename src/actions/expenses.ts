"use server";

import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";
import { expenseIdsSchema, expenseSchema } from "@/lib/validators/expense";
import { isReservedCategoryName } from "@/lib/reserved-categories";
import { parseSignedAmount } from "@/lib/amounts";
import { buildEntryHints, type EntryHints } from "@/lib/entry-hints";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSelectedAccountId } from "./accounts";
import { daysAgo, toLocalISODate } from "@/lib/dates";
import {
  getOrCreateIncomeCategory,
  getOrCreateDebtCategory,
  getOrCreateTransferCategory,
  getDebtCategoryId,
  getTransferCategoryId,
} from "./categories";
import { breakdownByCategory, summarizeMovements } from "@/lib/filter-summary";

export async function getExpenses(params: {
  month: number;
  year: number;
}) {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  return db.expenses.findWithCategoryByMonth(accountId, params.month, params.year);
}

export async function getExpensesPaginated(params: {
  page: number;
  limit?: number;
  ascending?: boolean;
  search?: string;
  categoryId?: string;
  /** Leave out movements dated after today (ones entered ahead of time). */
  excludeFuture?: boolean;
}) {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const limit = params.limit ?? 50;
  // The server runs in UTC: for a couple of hours after midnight in Spain its
  // "today" is still yesterday, so allow one extra day rather than hide today.
  const until = params.excludeFuture ? toLocalISODate(daysAgo(-1)) : undefined;
  const data = await db.expenses.findPaginated(accountId, {
    page: params.page,
    limit,
    ascending: params.ascending ?? false,
    search: params.search,
    categoryId: params.categoryId,
    until,
  });
  return { data, hasMore: data.length === limit };
}

/**
 * Overview of everything matching the list filters, across all pages: count and
 * total of the matches, plus the per-category breakdown of the search (taken
 * before the category filter, so the other categories stay visible to switch to).
 */
export async function getFilteredOverview(params: { search?: string; categoryId?: string }) {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const [rows, debtCategoryId, transferCategoryId] = await Promise.all([
    db.expenses.findAmountsFiltered(accountId, { search: params.search?.trim() || undefined }),
    getDebtCategoryId(),
    getTransferCategoryId(),
  ]);
  const opts = { categoryId: params.categoryId, debtCategoryId, transferCategoryId };
  const matches = params.categoryId ? rows.filter((row) => row.category_id === params.categoryId) : rows;
  return { summary: summarizeMovements(matches, opts), breakdown: breakdownByCategory(rows, opts) };
}

export async function suggestCategory(concept: string) {
  const accountId = await getSelectedAccountId();

  const trimmed = concept.trim();
  if (!trimmed) return null;

  const db = await getDb();
  const data = await db.expenses.findLatestByConceptIlike(accountId, trimmed);
  if (!data) return null;

  const cat = data.category as unknown as { id: string; name: string } | null;
  if (!cat) return null;

  const excluded = ["ingreso", "deuda", "traspaso"];
  if (excluded.includes(cat.name.toLowerCase())) return null;

  return { category_id: cat.id, category_name: cat.name };
}

/** How many recent movements feed the quick-entry hints. */
const HINTS_WINDOW = 300;

export async function getEntryHints(): Promise<EntryHints> {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const rows = await db.expenses.findRecentForHints(accountId, HINTS_WINDOW);
  return buildEntryHints(
    rows.map((r) => ({
      concept: r.concept,
      category_id: r.category_id,
      amount: r.amount,
      categoryName: r.category?.name ?? null,
    }))
  );
}

export async function searchExpenses(query: string) {
  const accountId = await getSelectedAccountId();

  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = await getDb();
  return db.expenses.searchWithCategory(accountId, trimmed);
}

export async function getExpensesByYear(year: number) {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  return db.expenses.findWithCategoryByYear(accountId, year);
}

export async function createExpense(formData: FormData) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const amount = parseSignedAmount(formData);
  const isIncome = formData.get("is_income") === "true";
  const isDebt = formData.get("is_debt") === "true";

  let categoryId = formData.get("category_id") as string | null;
  if (isIncome && !categoryId) {
    categoryId = await getOrCreateIncomeCategory();
    if (!categoryId) return { error: "No se pudo asignar categoría de ingreso" };
  } else if (isDebt && !categoryId) {
    categoryId = await getOrCreateDebtCategory();
    if (!categoryId) return { error: "No se pudo asignar categoría de deuda" };
  }

  const parsed = expenseSchema.safeParse({
    amount,
    concept: formData.get("concept") || null,
    category_id: categoryId,
    expense_date: formData.get("expense_date"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const accountId = await getSelectedAccountId();
  const paymentMethod = (formData.get("payment_method") as string) || "bank";

  const db = await getDb();
  const { error } = await db.expenses.create({
    ...parsed.data,
    payment_method: paymentMethod,
    user_id: user.id,
    ...(accountId ? { account_id: accountId } : { account_id: null }),
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}

export async function createTransfer(formData: FormData) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const rawAmount = Math.abs(parseFloat(formData.get("amount") as string));
  if (!rawAmount || rawAmount <= 0) return { error: "Importe inválido" };

  const direction = formData.get("transfer_direction") as string;
  const expenseDate = formData.get("expense_date") as string;
  const concept = (formData.get("concept") as string) || "";
  const notes = (formData.get("notes") as string) || null;

  if (!expenseDate) return { error: "Fecha requerida" };

  const categoryId = await getOrCreateTransferCategory();
  if (!categoryId) return { error: "No se pudo asignar categoría de traspaso" };

  const accountId = await getSelectedAccountId();
  const pairId = crypto.randomUUID();

  const sourceMethod = direction === "bank_to_cash" ? "bank" : "cash";
  const destMethod = direction === "bank_to_cash" ? "cash" : "bank";

  const db = await getDb();
  const { error } = await db.expenses.createMany([
    {
      amount: -rawAmount,
      concept,
      category_id: categoryId,
      expense_date: expenseDate,
      payment_method: sourceMethod,
      transfer_pair_id: pairId,
      notes,
      user_id: user.id,
      account_id: accountId,
    },
    {
      amount: rawAmount,
      concept,
      category_id: categoryId,
      expense_date: expenseDate,
      payment_method: destMethod,
      transfer_pair_id: pairId,
      notes,
      user_id: user.id,
      account_id: accountId,
    },
  ]);

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}

export async function updateTransfer(id: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const rawAmount = Math.abs(parseFloat(formData.get("amount") as string));
  if (!rawAmount || rawAmount <= 0) return { error: "Importe inválido" };

  const direction = formData.get("transfer_direction") as string;
  const expenseDate = formData.get("expense_date") as string;
  const concept = (formData.get("concept") as string) || "";
  const notes = (formData.get("notes") as string) || null;

  if (!expenseDate) return { error: "Fecha requerida" };

  const sourceMethod = direction === "bank_to_cash" ? "bank" : "cash";
  const destMethod = direction === "bank_to_cash" ? "cash" : "bank";

  const db = await getDb();
  const expense = await db.expenses.findTransferPair(id, user.id);
  if (!expense?.transfer_pair_id) return { error: "Traspaso no encontrado" };

  const both = await db.expenses.findByTransferPair(expense.transfer_pair_id, user.id);
  const sourceLeg = both.find((e) => e.amount < 0);
  const destLeg = both.find((e) => e.amount > 0);
  if (!sourceLeg || !destLeg) return { error: "Traspaso incompleto" };

  const common = { concept, expense_date: expenseDate, notes, updated_at: new Date().toISOString() };
  const [r1, r2] = await Promise.all([
    db.expenses.update(sourceLeg.id, user.id, { ...common, amount: -rawAmount, payment_method: sourceMethod }),
    db.expenses.update(destLeg.id, user.id, { ...common, amount: rawAmount, payment_method: destMethod }),
  ]);

  if (r1.error) return { error: r1.error };
  if (r2.error) return { error: r2.error };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}

export async function updateExpense(id: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const amount = parseSignedAmount(formData);
  const isIncome = formData.get("is_income") === "true";
  const isDebt = formData.get("is_debt") === "true";

  let categoryId = formData.get("category_id") as string | null;
  if (isIncome && !categoryId) {
    categoryId = await getOrCreateIncomeCategory();
    if (!categoryId) return { error: "No se pudo asignar categoría de ingreso" };
  } else if (isDebt && !categoryId) {
    categoryId = await getOrCreateDebtCategory();
    if (!categoryId) return { error: "No se pudo asignar categoría de deuda" };
  }

  const parsed = expenseSchema.safeParse({
    amount,
    concept: formData.get("concept") || null,
    category_id: categoryId,
    expense_date: formData.get("expense_date"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const paymentMethod = (formData.get("payment_method") as string) || "bank";

  const db = await getDb();
  const { error } = await db.expenses.update(id, user.id, {
    ...parsed.data,
    payment_method: paymentMethod,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}

/** Deletes several movements at once. A transfer goes with both of its legs. */
export async function deleteExpenses(ids: string[]) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const parsed = expenseIdsSchema.safeParse(ids);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const found = await db.expenses.findByIds(parsed.data, user.id);
  if (found.error) return { error: found.error };

  const pairIds = [...new Set(found.rows.flatMap((row) => (row.transfer_pair_id ? [row.transfer_pair_id] : [])))];
  const soloIds = found.rows.filter((row) => !row.transfer_pair_id).map((row) => row.id);

  const solo = await db.expenses.deleteMany(soloIds, user.id);
  const pairs = solo.error ? { deleted: 0, error: null } : await db.expenses.deleteMany(pairIds, user.id, "transfer_pair_id");
  const deleted = solo.deleted + pairs.deleted;

  // Even after a partial failure, whatever was deleted must stop showing.
  if (deleted > 0) revalidateMovementPages();
  const error = solo.error ?? pairs.error;
  if (error) return { error };
  return { success: true, deleted };
}

/**
 * Moves several movements to another category. Incomes, debts and transfers
 * are left alone: their category is what defines them.
 */
export async function setExpensesCategory(ids: string[], categoryId: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const parsed = expenseIdsSchema.safeParse(ids);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const categories: { id: string; name: string }[] = await db.categories.findAll(accountId);
  const target = categories.find((category) => category.id === categoryId);
  if (!target || isReservedCategoryName(target.name)) return { error: "Categoría no válida" };
  const reserved = new Set(categories.filter((c) => isReservedCategoryName(c.name)).map((c) => c.id));

  const found = await db.expenses.findByIds(parsed.data, user.id);
  if (found.error) return { error: found.error };

  const eligible = found.rows
    .filter((row) => !row.transfer_pair_id && !(row.category_id && reserved.has(row.category_id)))
    .map((row) => row.id);

  const { updated, error } = await db.expenses.updateCategoryMany(eligible, user.id, target.id);
  if (updated > 0) revalidateMovementPages();
  if (error) return { error };
  return { success: true, updated, skipped: parsed.data.length - updated };
}

function revalidateMovementPages() {
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
}

export async function getAvailablePeriods() {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const data = await db.expenses.findAllDates(accountId);

  const periods = new Map<number, Set<number>>();
  for (const row of data) {
    const d = new Date(row.expense_date);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (!periods.has(y)) periods.set(y, new Set());
    periods.get(y)!.add(m);
  }

  const result: { year: number; months: number[] }[] = [];
  for (const [year, months] of Array.from(periods.entries()).sort((a, b) => b[0] - a[0])) {
    result.push({ year, months: Array.from(months).sort((a, b) => a - b) });
  }

  return result;
}

export async function getAllTimeBalance(debtCategoryId?: string | null) {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const data = await db.expenses.findAllAmounts(accountId);

  const byYear = new Map<number, number>();
  let total = 0;
  let bankTotal = 0;
  let cashTotal = 0;

  for (const row of data) {
    if (debtCategoryId && row.category_id === debtCategoryId) continue;
    const y = new Date(row.expense_date).getFullYear();
    byYear.set(y, (byYear.get(y) || 0) + row.amount);
    total += row.amount;

    if (row.payment_method === "cash") {
      cashTotal += row.amount;
    } else {
      bankTotal += row.amount;
    }
  }

  const years = Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, neto]) => ({ year, neto }));

  return { total, bankTotal, cashTotal, years };
}

export async function comparePeriods(params: {
  yearA: number;
  monthA?: number | null;
  yearB: number;
  monthB?: number | null;
}) {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const { yearA, monthA, yearB, monthB } = params;

  async function fetchPeriod(year: number, month?: number | null) {
    if (month) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;
      return db.expenses.findAmountsByDateRange(accountId, start, end);
    } else {
      return db.expenses.findAmountsByDateRange(
        accountId,
        `${year}-01-01`,
        `${year + 1}-01-01`,
      );
    }
  }

  const [expensesA, expensesB, cats] = await Promise.all([
    fetchPeriod(yearA, monthA),
    fetchPeriod(yearB, monthB),
    db.categories.findWithDetails(accountId),
  ]);

  const excludeNames = ["deuda", "traspaso"];
  const excludeIds = new Set(
    cats
      .filter((c) => excludeNames.includes(c.name.toLowerCase()))
      .map((c) => c.id),
  );

  const allCatIds = new Set([
    ...expensesA.map((e) => e.category_id),
    ...expensesB.map((e) => e.category_id),
  ]);

  const rows: {
    name: string;
    icon: string;
    color: string;
    valueA: number;
    valueB: number;
    diff: number;
  }[] = [];

  for (const catId of allCatIds) {
    if (excludeIds.has(catId)) continue;
    const cat = cats.find((c) => c.id === catId);
    if (!cat) continue;

    const valueA = expensesA
      .filter((e) => e.category_id === catId)
      .reduce((s, e) => s + e.amount, 0);
    const valueB = expensesB
      .filter((e) => e.category_id === catId)
      .reduce((s, e) => s + e.amount, 0);
    if (valueA === 0 && valueB === 0) continue;

    rows.push({
      name: cat.name,
      icon: cat.icon || "📦",
      color: cat.color || "#64748b",
      valueA,
      valueB,
      diff: valueA - valueB,
    });
  }

  rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return rows;
}

export async function checkDuplicate(params: {
  amount: number;
  category_id: string;
  expense_date: string;
  excludeId?: string;
}) {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const data = await db.expenses.findDuplicate(accountId, params);

  if (data) {
    return { duplicate: true, concept: data.concept };
  }
  return { duplicate: false };
}

export async function deleteExpense(id: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const expense = await db.expenses.findTransferPair(id, user.id);

  if (expense?.transfer_pair_id) {
    const { error } = await db.expenses.deleteByTransferPair(expense.transfer_pair_id, user.id);
    if (error) return { error };
  } else {
    const { error } = await db.expenses.delete(id, user.id);
    if (error) return { error };
  }

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}
