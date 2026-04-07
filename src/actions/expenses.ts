"use server";

import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  const startDate = `${params.year}-${String(params.month).padStart(2, "0")}-01`;
  const endDate =
    params.month === 12
      ? `${params.year + 1}-01-01`
      : `${params.year}-${String(params.month + 1).padStart(2, "0")}-01`;

  let query = supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .gte("expense_date", startDate)
    .lt("expense_date", endDate)
    .order("expense_date", { ascending: true });

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function suggestCategory(concept: string) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  const trimmed = concept.trim();
  if (!trimmed) return null;

  let q = supabase
    .from("expenses")
    .select("category_id, category:categories(id, name)")
    .ilike("concept", trimmed)
    .order("expense_date", { ascending: false })
    .limit(1);

  if (accountId) q = q.eq("account_id", accountId);

  const { data } = await q;
  if (!data || data.length === 0) return null;

  const cat = data[0].category as unknown as { id: string; name: string } | null;
  if (!cat) return null;

  const excluded = ["ingreso", "deuda", "traspaso"];
  if (excluded.includes(cat.name.toLowerCase())) return null;

  return { category_id: cat.id, category_name: cat.name };
}

export async function searchExpenses(query: string) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  const trimmed = query.trim();
  if (!trimmed) return [];

  let q = supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .ilike("concept", `%${trimmed}%`)
    .order("expense_date", { ascending: false })
    .limit(50);

  if (accountId) {
    q = q.eq("account_id", accountId);
  }

  const { data, error } = await q;

  if (error) throw error;
  return data;
}

export async function getExpensesByYear(year: number) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  let query = supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .gte("expense_date", `${year}-01-01`)
    .lt("expense_date", `${year + 1}-01-01`)
    .order("expense_date", { ascending: true });

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const { error } = await supabase.from("expenses").insert({
    ...parsed.data,
    payment_method: paymentMethod,
    user_id: user.id,
    ...(accountId ? { account_id: accountId } : {}),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}

export async function createTransfer(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawAmount = Math.abs(parseFloat(formData.get("amount") as string));
  if (!rawAmount || rawAmount <= 0) return { error: "Importe inválido" };

  const direction = formData.get("transfer_direction") as string; // "bank_to_cash" | "cash_to_bank"
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

  const { error } = await supabase.from("expenses").insert([
    {
      amount: -rawAmount,
      concept,
      category_id: categoryId,
      expense_date: expenseDate,
      payment_method: sourceMethod,
      transfer_pair_id: pairId,
      notes,
      user_id: user.id,
      ...(accountId ? { account_id: accountId } : {}),
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
      ...(accountId ? { account_id: accountId } : {}),
    },
  ]);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const { error } = await supabase
    .from("expenses")
    .update({
      ...parsed.data,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}

export async function getAvailablePeriods() {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  let query = supabase
    .from("expenses")
    .select("expense_date");

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const periods = new Map<number, Set<number>>();
  for (const row of data || []) {
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
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  let query = supabase
    .from("expenses")
    .select("expense_date, amount, category_id, payment_method");

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const byYear = new Map<number, number>();
  let total = 0;
  let bankTotal = 0;
  let cashTotal = 0;

  for (const row of data || []) {
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
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  const { month, year, debtCategoryId, transferCategoryId } = params;

  const isExcluded = (categoryId: string) =>
    (debtCategoryId && categoryId === debtCategoryId) ||
    (transferCategoryId && categoryId === transferCategoryId);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${monthStr}-01`;
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  // 1. Current month net (excluding debt/transfer)
  let currentQuery = supabase
    .from("expenses")
    .select("amount, category_id")
    .gte("expense_date", startDate)
    .lt("expense_date", endDate);
  if (accountId) currentQuery = currentQuery.eq("account_id", accountId);

  const { data: currentExpenses } = await currentQuery;

  const currentNet = (currentExpenses || [])
    .filter((e) => !isExcluded(e.category_id))
    .reduce((s, e) => s + e.amount, 0);

  // 2. Pending recurring expenses (scheduled but not yet generated this month)
  let recurringQuery = supabase
    .from("recurring_expenses")
    .select("id, amount, schedule_type, day_of_month, created_at")
    .eq("is_active", true);
  if (accountId) recurringQuery = recurringQuery.eq("account_id", accountId);

  const { data: allRecurring } = await recurringQuery;

  let existingQuery = supabase
    .from("expenses")
    .select("notes")
    .like("notes", "auto:recurring:%")
    .gte("expense_date", startDate)
    .lt("expense_date", endDate);
  if (accountId) existingQuery = existingQuery.eq("account_id", accountId);

  const { data: existingRecurring } = await existingQuery;

  const alreadyInserted = new Set(
    (existingRecurring || [])
      .map((e) => e.notes?.replace("auto:recurring:", ""))
      .filter(Boolean),
  );

  const { getScheduledDay } = await import("@/lib/recurring");
  const pendingRecurring = (allRecurring || []).filter((r) => {
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
    if (hMonth <= 0) { hMonth += 12; hYear -= 1; }

    const hStart = `${hYear}-${String(hMonth).padStart(2, "0")}-01`;
    const hEnd = hMonth === 12
      ? `${hYear + 1}-01-01`
      : `${hYear}-${String(hMonth + 1).padStart(2, "0")}-01`;

    let hQuery = supabase
      .from("expenses")
      .select("amount, category_id")
      .gte("expense_date", hStart)
      .lt("expense_date", hEnd);
    if (accountId) hQuery = hQuery.eq("account_id", accountId);

    const { data: hExpenses } = await hQuery;
    if (!hExpenses || hExpenses.length < 5) continue;

    const net = hExpenses
      .filter((e) => !isExcluded(e.category_id))
      .reduce((s, e) => s + e.amount, 0);
    historicalNets.push(net);
  }

  // 4. Calculate projection
  const today = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayOfMonth = today.getFullYear() === year && today.getMonth() + 1 === month
    ? today.getDate()
    : daysInMonth;
  const monthProgress = dayOfMonth / daysInMonth;

  // Use median (resistant to outliers like one-off large movements)
  const sorted = [...historicalNets].sort((a, b) => a - b);
  const medianHistorical = sorted.length > 0
    ? sorted.length % 2 === 1
      ? sorted[Math.floor(sorted.length / 2)]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : null;

  let projected: number | null = null;
  const historicalMonths = historicalNets.length;

  if (medianHistorical !== null) {
    if (monthProgress < 0.5) {
      // First half: trust historical median (current pace is unreliable)
      projected = medianHistorical + pendingRecurringNet;
    } else {
      // Second half: gradually blend in current pace
      const currentPace = currentNet / monthProgress;
      const blendWeight = (monthProgress - 0.5) * 2; // 0 at 50%, 1 at 100%
      projected = (currentPace * blendWeight + medianHistorical * (1 - blendWeight)) + pendingRecurringNet;
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
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  const { yearA, monthA, yearB, monthB } = params;

  async function fetchPeriod(year: number, month?: number | null) {
    if (month) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;
      let q = supabase.from("expenses").select("amount, category_id").gte("expense_date", start).lt("expense_date", end);
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      return data || [];
    } else {
      let q = supabase.from("expenses").select("amount, category_id").gte("expense_date", `${year}-01-01`).lt("expense_date", `${year + 1}-01-01`);
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      return data || [];
    }
  }

  const [expensesA, expensesB, cats] = await Promise.all([
    fetchPeriod(yearA, monthA),
    fetchPeriod(yearB, monthB),
    (async () => {
      let q = supabase.from("categories").select("id, name, icon, color");
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      return data || [];
    })(),
  ]);

  // Get special category IDs to exclude
  const excludeNames = ["deuda", "traspaso"];
  const excludeIds = new Set(cats.filter((c) => excludeNames.includes(c.name.toLowerCase())).map((c) => c.id));

  const allCatIds = new Set([...expensesA.map((e) => e.category_id), ...expensesB.map((e) => e.category_id)]);

  const rows: { name: string; icon: string; color: string; valueA: number; valueB: number; diff: number }[] = [];

  for (const catId of allCatIds) {
    if (excludeIds.has(catId)) continue;
    const cat = cats.find((c) => c.id === catId);
    if (!cat) continue;

    const valueA = expensesA.filter((e) => e.category_id === catId).reduce((s, e) => s + e.amount, 0);
    const valueB = expensesB.filter((e) => e.category_id === catId).reduce((s, e) => s + e.amount, 0);
    if (valueA === 0 && valueB === 0) continue;

    rows.push({ name: cat.name, icon: cat.icon || "📦", color: cat.color || "#64748b", valueA, valueB, diff: valueA - valueB });
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
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  let q = supabase
    .from("expenses")
    .select("id, concept")
    .eq("amount", params.amount)
    .eq("category_id", params.category_id)
    .eq("expense_date", params.expense_date)
    .limit(1);

  if (accountId) q = q.eq("account_id", accountId);
  if (params.excludeId) q = q.neq("id", params.excludeId);

  const { data } = await q;

  if (data && data.length > 0) {
    return { duplicate: true, concept: data[0].concept };
  }
  return { duplicate: false };
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if this expense is part of a transfer pair
  const { data: expense } = await supabase
    .from("expenses")
    .select("transfer_pair_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (expense?.transfer_pair_id) {
    // Delete both legs of the transfer
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("transfer_pair_id", expense.transfer_pair_id)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}
