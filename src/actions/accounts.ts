"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ACCOUNT_COOKIE = "iglu_account_id";

export async function getAccounts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return [];
  return data;
}

export async function getSelectedAccountId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCOUNT_COOKIE)?.value ?? null;
}

/** Sets the cookie without redirect — used internally by the layout for auto-selection */
export async function setSelectedAccount(accountId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_COOKIE, accountId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

/** Sets the cookie, invalidates cache, and redirects — used by the account switcher UI */
export async function getAccountSettings() {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const { data, error } = await supabase
    .from("accounts")
    .select("id, has_investments")
    .eq("id", accountId)
    .single();

  if (error) return null;
  return data;
}

export async function hasInvestmentsEnabled(): Promise<boolean> {
  const settings = await getAccountSettings();
  return settings?.has_investments ?? false;
}

export async function toggleInvestments(enabled: boolean) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const { error } = await supabase
    .from("accounts")
    .update({ has_investments: enabled })
    .eq("id", accountId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function notificationsEnabled(): Promise<boolean> {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return false;

  const { data } = await supabase
    .from("accounts")
    .select("notifications_enabled")
    .eq("id", accountId)
    .single();

  return data?.notifications_enabled ?? true;
}

export async function toggleNotifications(enabled: boolean) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const { error } = await supabase
    .from("accounts")
    .update({ notifications_enabled: enabled })
    .eq("id", accountId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function createAccount(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = name.trim();
  if (!trimmed) return { error: "El nombre es obligatorio" };

  const { data: account, error } = await supabase
    .from("accounts")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: memberError } = await supabase
    .from("account_members")
    .insert({ account_id: account.id, user_id: user.id, role: "owner" });

  if (memberError) return { error: memberError.message };

  revalidatePath("/", "layout");
  return { success: true, id: account.id };
}

export async function renameAccount(accountId: string, name: string) {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { error: "El nombre es obligatorio" };

  const { error } = await supabase
    .from("accounts")
    .update({ name: trimmed })
    .eq("id", accountId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getAccountDataCounts(accountId: string) {
  const supabase = await createClient();

  const [expenses, recurring, categories, investments] = await Promise.all([
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
    supabase
      .from("recurring_expenses")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
    supabase
      .from("investment_funds")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
  ]);

  return {
    expenses: expenses.count ?? 0,
    recurring: recurring.count ?? 0,
    categories: categories.count ?? 0,
    investments: investments.count ?? 0,
  };
}

export async function deleteAccount(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify ownership
  const { data: membership } = await supabase
    .from("account_members")
    .select("role")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "owner") {
    return { error: "Solo el propietario puede eliminar la cuenta" };
  }

  // Nullify expenses and recurring (ON DELETE SET NULL)
  // Categories, investments cascade automatically

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId);

  if (error) return { error: error.message };

  // If deleted account was selected, clear cookie
  const selectedId = await getSelectedAccountId();
  if (selectedId === accountId) {
    const cookieStore = await cookies();
    cookieStore.delete(ACCOUNT_COOKIE);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function selectAccount(accountId: string) {
  // Verify the user is a member of this account
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("account_members")
    .select("id")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .limit(1);

  if (!data || data.length === 0) {
    redirect("/login");
  }

  await setSelectedAccount(accountId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
