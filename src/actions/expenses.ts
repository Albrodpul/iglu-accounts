"use server";

import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/validators/expense";
import { parseSignedAmount } from "@/lib/amounts";
import { revalidatePath } from "next/cache";
import { getSelectedAccountId } from "./accounts";

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
  if (!user) return { error: "No autenticado" };

  const amount = parseSignedAmount(formData);

  const parsed = expenseSchema.safeParse({
    amount,
    concept: formData.get("concept") || null,
    category_id: formData.get("category_id"),
    expense_date: formData.get("expense_date"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const accountId = await getSelectedAccountId();

  const { error } = await supabase.from("expenses").insert({
    ...parsed.data,
    user_id: user.id,
    ...(accountId ? { account_id: accountId } : {}),
  });

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
  if (!user) return { error: "No autenticado" };

  const amount = parseSignedAmount(formData);

  const parsed = expenseSchema.safeParse({
    amount,
    concept: formData.get("concept") || null,
    category_id: formData.get("category_id"),
    expense_date: formData.get("expense_date"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      ...parsed.data,
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

export async function getAllTimeBalance() {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  let query = supabase
    .from("expenses")
    .select("expense_date, amount");

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const byYear = new Map<number, number>();
  let total = 0;

  for (const row of data || []) {
    const y = new Date(row.expense_date).getFullYear();
    byYear.set(y, (byYear.get(y) || 0) + row.amount);
    total += row.amount;
  }

  const years = Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, neto]) => ({ year, neto }));

  return { total, years };
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}
