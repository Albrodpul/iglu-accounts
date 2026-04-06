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
