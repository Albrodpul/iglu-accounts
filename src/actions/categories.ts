"use server";

import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validators/expense";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSelectedAccountId } from "./accounts";

export async function getCategories() {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();

  let query = supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    icon: (formData.get("icon") as string) || null,
    color: (formData.get("color") as string) || "#64748b",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("categories").insert({
    ...parsed.data,
    sort_order: parseInt((formData.get("sort_order") as string) || "99"),
    account_id: accountId,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    icon: (formData.get("icon") as string) || null,
    color: (formData.get("color") as string) || "#64748b",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}

/** Returns the "Ingreso" category for the current account, creating it if needed. */
export async function getOrCreateIncomeCategory(): Promise<string | null> {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("account_id", accountId)
    .ilike("name", "ingreso")
    .limit(1);

  if (existing && existing.length > 0) return existing[0].id;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      name: "Ingreso",
      icon: "💰",
      color: "#10b981",
      sort_order: 0,
      account_id: accountId,
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

/** Returns the "Deuda" category for the current account, creating it if needed. */
export async function getOrCreateDebtCategory(): Promise<string | null> {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("account_id", accountId)
    .ilike("name", "deuda")
    .limit(1);

  if (existing && existing.length > 0) return existing[0].id;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      name: "Deuda",
      icon: "🤝",
      color: "#f59e0b",
      sort_order: 0,
      account_id: accountId,
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

/** Returns the debt category ID for the current account, if it exists. */
export async function getDebtCategoryId(): Promise<string | null> {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("account_id", accountId)
    .ilike("name", "deuda")
    .limit(1);

  return data && data.length > 0 ? data[0].id : null;
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
