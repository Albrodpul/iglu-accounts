"use server";

import { getDb } from "@/lib/db";
import { getAuthUser, authUpdateUser } from "@/lib/db/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ACCOUNT_COOKIE = "iglu_account_id";

export async function getAccounts() {
  const db = await getDb();
  return db.accounts.findAll();
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

export async function getAccountSettings() {
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const db = await getDb();
  return db.accounts.findSettings(accountId);
}

export async function hasInvestmentsEnabled(): Promise<boolean> {
  const settings = await getAccountSettings();
  return settings?.has_investments ?? false;
}

export async function toggleInvestments(enabled: boolean) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const db = await getDb();
  const { error } = await db.accounts.update(accountId, { has_investments: enabled });

  if (error) return { error };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getDiscreteMode(): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return true;
  const db = await getDb();
  const prefs = await db.userPreferences.get(user.id);
  return prefs?.discrete_mode ?? true;
}

export async function setDiscreteMode(value: boolean) {
  const user = await getAuthUser();
  if (!user) return { error: "No autenticado" };
  const db = await getDb();
  const { error } = await db.userPreferences.upsert(user.id, { discrete_mode: value });
  if (error) return { error };
  return { success: true };
}

export async function notificationsEnabled(): Promise<boolean> {
  const accountId = await getSelectedAccountId();
  if (!accountId) return false;

  const db = await getDb();
  const data = await db.accounts.findForNotifications(accountId);
  return data?.notifications_enabled ?? true;
}

export async function toggleNotifications(enabled: boolean) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const db = await getDb();
  const { error } = await db.accounts.update(accountId, { notifications_enabled: enabled });

  if (error) return { error };

  revalidatePath("/settings");
  return { success: true };
}

export async function createAccount(name: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const trimmed = name.trim();
  if (!trimmed) return { error: "El nombre es obligatorio" };

  const db = await getDb();
  const { data: account, error } = await db.accounts.create(trimmed);

  if (error || !account) return { error: error ?? "Error al crear la cuenta" };

  const { error: memberError } = await db.accounts.createMember(account.id, user.id, "owner");

  if (memberError) return { error: memberError };

  revalidatePath("/", "layout");
  return { success: true, id: account.id };
}

export async function renameAccount(accountId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "El nombre es obligatorio" };

  const db = await getDb();
  const { error } = await db.accounts.update(accountId, { name: trimmed });

  if (error) return { error };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getAccountDataCounts(accountId: string) {
  const db = await getDb();
  return db.accounts.getDataCounts(accountId);
}

export async function deleteAccount(accountId: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const membership = await db.accounts.getMembership(accountId, user.id);

  if (membership?.role !== "owner") {
    return { error: "Solo el propietario puede eliminar la cuenta" };
  }

  const { error } = await db.accounts.delete(accountId);

  if (error) return { error };

  const selectedId = await getSelectedAccountId();
  if (selectedId === accountId) {
    const cookieStore = await cookies();
    cookieStore.delete(ACCOUNT_COOKIE);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getUserDisplayName(): Promise<string | null> {
  const user = await getAuthUser();
  if (!user) return null;
  return (
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null
  );
}

export async function updateDisplayName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "El nombre es obligatorio" };

  const { error } = await authUpdateUser({ data: { display_name: trimmed } });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function selectAccount(accountId: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const isMember = await db.accounts.isMember(accountId, user.id);

  if (!isMember) {
    redirect("/login");
  }

  await setSelectedAccount(accountId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
