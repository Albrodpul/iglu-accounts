"use server";

import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";
import { expenseSchema } from "@/lib/validators/expense";
import { parseSignedAmount } from "@/lib/amounts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSelectedAccountId } from "./accounts";
import { getOrCreateIncomeCategory, getOrCreateDebtCategory, getOrCreateTransferCategory } from "./categories";

export async function getExpenses(params: {
  month: number;
  year: number;
}) {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  return db.expenses.findWithCategoryByMonth(accountId, params.month, params.year);
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

export async function getMonthProjection(params: {
  month: number;
  year: number;
  debtCategoryId?: string | null;
  transferCategoryId?: string | null;
}) {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const { month, year, debtCategoryId, transferCategoryId } = params;

  const isExcluded = (categoryId: string) =>
    (debtCategoryId && categoryId === debtCategoryId) ||
    (transferCategoryId && categoryId === transferCategoryId);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${monthStr}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  // 1. Current month net (excluding debt/transfer)
  const currentExpenses = await db.expenses.findAmountsByDateRange(accountId, startDate, endDate);
  const currentNet = currentExpenses
    .filter((e) => !isExcluded(e.category_id))
    .reduce((s, e) => s + e.amount, 0);

  // 2. Pending recurring expenses (scheduled but not yet generated this month)
  const allRecurring = await db.recurring.findActiveMinimal(accountId);
  const existingNotes = await db.expenses.findRecurringNotesInRange(accountId, startDate, endDate);

  const alreadyInserted = new Set(
    existingNotes
      .map((e) => e.notes?.replace("auto:recurring:", ""))
      .filter(Boolean),
  );

  const { getScheduledDay } = await import("@/lib/recurring");
  const pendingRecurring = allRecurring.filter((r) => {
    if (alreadyInserted.has(r.id)) return false;
    const day = getScheduledDay(r, year, month);
    return day !== null;
  });
  const pendingRecurringNet = pendingRecurring.reduce((s, r) => s + r.amount, 0);

  // 3. Historical monthly nets (real months with ≥5 transactions)
  const historicalNets: number[] = [];

  for (let i = 1; i <= 12; i++) {
    let hMonth = month - i;
    let hYear = year;
    if (hMonth <= 0) {
      hMonth += 12;
      hYear -= 1;
    }

    const hStart = `${hYear}-${String(hMonth).padStart(2, "0")}-01`;
    const hEnd =
      hMonth === 12
        ? `${hYear + 1}-01-01`
        : `${hYear}-${String(hMonth + 1).padStart(2, "0")}-01`;

    const hExpenses = await db.expenses.findAmountsByDateRange(accountId, hStart, hEnd);
    if (hExpenses.length < 5) continue;

    const net = hExpenses
      .filter((e) => !isExcluded(e.category_id))
      .reduce((s, e) => s + e.amount, 0);
    historicalNets.push(net);
  }

  // 4. Calculate projection
  const today = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayOfMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? today.getDate()
      : daysInMonth;
  const monthProgress = dayOfMonth / daysInMonth;

  const sorted = [...historicalNets].sort((a, b) => a - b);
  const medianHistorical =
    sorted.length > 0
      ? sorted.length % 2 === 1
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : null;

  let projected: number | null = null;
  const historicalMonths = historicalNets.length;

  if (medianHistorical !== null) {
    if (monthProgress < 0.5) {
      projected = medianHistorical + pendingRecurringNet;
    } else {
      const currentPace = currentNet / monthProgress;
      const blendWeight = (monthProgress - 0.5) * 2;
      projected =
        currentPace * blendWeight +
        medianHistorical * (1 - blendWeight) +
        pendingRecurringNet;
    }
  } else {
    projected = currentNet + pendingRecurringNet;
  }

  return { currentNet, projected, monthProgress, historicalMonths, pendingRecurringNet };
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
