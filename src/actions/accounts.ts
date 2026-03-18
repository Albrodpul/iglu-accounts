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
