"use server";

import { createClient } from "@/lib/supabase/server";
import { recurringExpenseSchema } from "@/lib/validators/expense";
import { parseSignedAmount } from "@/lib/amounts";
import { revalidatePath } from "next/cache";
import { getSelectedAccountId } from "./accounts";

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
  if (!user) return { error: "No autenticado" };

  const amount = parseSignedAmount(formData);
  const scheduleType = (formData.get("schedule_type") as string) || "monthly";
  const dayValue = formData.get("day_of_month") as string;

  const parsed = recurringExpenseSchema.safeParse({
    amount,
    concept: formData.get("concept"),
    category_id: formData.get("category_id"),
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
  if (!user) return { error: "No autenticado" };

  const amount = parseSignedAmount(formData);
  const scheduleType = (formData.get("schedule_type") as string) || "monthly";
  const dayValue = formData.get("day_of_month") as string;

  const parsed = recurringExpenseSchema.safeParse({
    amount,
    concept: formData.get("concept"),
    category_id: formData.get("category_id"),
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

export async function deleteRecurringExpense(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

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
