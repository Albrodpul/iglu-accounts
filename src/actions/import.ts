"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function importExpenses(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const rawAmount = parseFloat(formData.get("amount") as string);
  const isIncome = formData.get("is_income") === "true";
  const amount = isIncome ? Math.abs(rawAmount) : -Math.abs(rawAmount);

  const { error } = await supabase.from("expenses").insert({
    amount,
    concept: formData.get("concept") as string,
    category_id: formData.get("category_id") as string,
    expense_date: formData.get("expense_date") as string,
    user_id: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}
