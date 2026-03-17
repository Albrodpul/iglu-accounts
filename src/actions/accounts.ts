"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAccounts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get accounts where user is owner or member
  const { data: memberOf } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id);

  const accountIds = memberOf?.map((m) => m.account_id) ?? [];

  // Also get accounts directly owned
  const { data: owned } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id);

  const ownedIds = owned?.map((a) => a.id) ?? [];
  const allIds = [...new Set([...accountIds, ...ownedIds])];

  if (allIds.length === 0) return owned ?? [];

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .in("id", allIds)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return [];
  return data;
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const name = (formData.get("name") as string)?.trim();
  const icon = (formData.get("icon") as string) || "🏠";
  const color = (formData.get("color") as string) || "#10b981";

  if (!name) return { error: "El nombre es obligatorio" };

  // Check if user has any accounts - if not, this is the default
  const existing = await getAccounts();
  const isDefault = existing.length === 0;

  const { data: account, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name,
      icon,
      color,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Add owner as member
  await supabase.from("account_members").insert({
    account_id: account.id,
    user_id: user.id,
    role: "owner",
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true, account };
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}

export async function setDefaultAccount(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Remove default from all user accounts
  await supabase
    .from("accounts")
    .update({ is_default: false })
    .eq("user_id", user.id);

  // Set new default
  const { error } = await supabase
    .from("accounts")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}
