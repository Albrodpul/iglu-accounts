"use server";

import { createClient } from "@/lib/supabase/server";
import { recurringExpenseSchema } from "@/lib/validators/expense";
import { parseSignedAmount } from "@/lib/amounts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSelectedAccountId } from "./accounts";
import { getOrCreateIncomeCategory } from "./categories";
import { getScheduledDay } from "@/lib/recurring";

export async function getRecurringExpenses() {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  let query = supabase
    .from("recurring_expenses")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .order("concept", { ascending: true });

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function createRecurringExpense(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const amount = parseSignedAmount(formData);
  const isIncome = formData.get("is_income") === "true";
  const scheduleType = (formData.get("schedule_type") as string) || "monthly";
  const dayValue = formData.get("day_of_month") as string;
  const categoryValue = formData.get("category_id");
  let categoryId = typeof categoryValue === "string" && categoryValue.trim().length > 0
    ? categoryValue
    : null;

  if (isIncome && !categoryId) {
    categoryId = await getOrCreateIncomeCategory();
    if (!categoryId) return { error: "No se pudo asignar categoría de ingreso" };
  }

  const parsed = recurringExpenseSchema.safeParse({
    amount,
    concept: formData.get("concept"),
    category_id: categoryId,
    day_of_month: dayValue ? parseInt(dayValue) : null,
    schedule_type: scheduleType,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const accountId = await getSelectedAccountId();

  const { error } = await supabase.from("recurring_expenses").insert({
    ...parsed.data,
    user_id: user.id,
    ...(accountId ? { account_id: accountId } : {}),
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/summary");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateRecurringExpense(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const amount = parseSignedAmount(formData);
  const isIncome = formData.get("is_income") === "true";
  const scheduleType = (formData.get("schedule_type") as string) || "monthly";
  const dayValue = formData.get("day_of_month") as string;
  const categoryValue = formData.get("category_id");
  let categoryId = typeof categoryValue === "string" && categoryValue.trim().length > 0
    ? categoryValue
    : null;

  if (isIncome && !categoryId) {
    categoryId = await getOrCreateIncomeCategory();
    if (!categoryId) return { error: "No se pudo asignar categoría de ingreso" };
  }

  const parsed = recurringExpenseSchema.safeParse({
    amount,
    concept: formData.get("concept"),
    category_id: categoryId,
    day_of_month: dayValue ? parseInt(dayValue) : null,
    schedule_type: scheduleType,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("recurring_expenses")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/summary");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function triggerRecurringExpenses() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await getSelectedAccountId();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // Get active recurring items for this account
  let query = supabase
    .from("recurring_expenses")
    .select("*")
    .eq("is_active", true)
    .eq("user_id", user.id);

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data: recurring, error: fetchError } = await query;

  if (fetchError) return { error: fetchError.message };
  if (!recurring || recurring.length === 0) {
    return { error: "No hay movimientos fijos configurados" };
  }

  // Check which have already been inserted this month
  let existingQuery = supabase
    .from("expenses")
    .select("notes")
    .eq("user_id", user.id)
    .like("notes", "auto:recurring:%")
    .gte("expense_date", `${monthStr}-01`)
    .lt(
      "expense_date",
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`
    );

  if (accountId) {
    existingQuery = existingQuery.eq("account_id", accountId);
  }

  const { data: existing } = await existingQuery;

  const alreadyInserted = new Set(
    (existing || [])
      .map((e) => e.notes?.replace("auto:recurring:", ""))
      .filter(Boolean)
  );

  // Catch-up: insert all pending items with scheduled day <= today
  const toInsert = recurring
    .filter((r) => {
      if (alreadyInserted.has(r.id)) return false;
      const day = getScheduledDay(r, year, month);
      return day !== null && day <= today;
    })
    .map((r) => {
      const day = getScheduledDay(r, year, month)!;
      return {
        user_id: user.id,
        account_id: r.account_id,
        category_id: r.category_id,
        amount: r.amount,
        concept: r.concept || (r.amount > 0 ? "Ingreso fijo" : "Gasto fijo"),
        expense_date: `${monthStr}-${String(day).padStart(2, "0")}`,
        notes: `auto:recurring:${r.id}`,
      };
    });

  if (toInsert.length === 0) {
    return { inserted: 0, message: "No hay movimientos fijos pendientes hasta hoy" };
  }

  const { error: insertError } = await supabase.from("expenses").insert(toInsert);

  if (insertError) return { error: insertError.message };

  revalidatePath("/settings");
  revalidatePath("/summary");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return { inserted: toInsert.length, message: `${toInsert.length} movimiento(s) fijo(s) insertado(s)` };
}

export async function deleteRecurringExpense(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("recurring_expenses")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/summary");
  revalidatePath("/dashboard");
  return { success: true };
}
