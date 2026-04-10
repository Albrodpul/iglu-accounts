"use server";

import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";
import { categorySchema } from "@/lib/validators/expense";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSelectedAccountId } from "./accounts";

export async function getCategories() {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  return db.categories.findAll(accountId);
}

export async function createCategory(formData: FormData) {
  const user = await getAuthUser();
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

  const db = await getDb();
  const { error } = await db.categories.create({
    ...parsed.data,
    sort_order: parseInt((formData.get("sort_order") as string) || "99"),
    account_id: accountId,
  });

  if (error) return { error };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const user = await getAuthUser();
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

  const db = await getDb();
  const { error } = await db.categories.update(id, accountId, parsed.data);

  if (error) return { error };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
}

/** Returns the "Ingreso" category for the current account, creating it if needed. */
export async function getOrCreateIncomeCategory(): Promise<string | null> {
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const db = await getDb();
  const existing = await db.categories.findByNameIlike(accountId, "ingreso");
  if (existing) return existing.id;

  const { data: created } = await db.categories.create({
    name: "Ingreso",
    icon: "💰",
    color: "#10b981",
    sort_order: 0,
    account_id: accountId,
  });

  return created?.id ?? null;
}

/** Returns the "Deuda" category for the current account, creating it if needed. */
export async function getOrCreateDebtCategory(): Promise<string | null> {
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const db = await getDb();
  const existing = await db.categories.findByNameIlike(accountId, "deuda");
  if (existing) return existing.id;

  const { data: created } = await db.categories.create({
    name: "Deuda",
    icon: "🤝",
    color: "#f59e0b",
    sort_order: 0,
    account_id: accountId,
  });

  return created?.id ?? null;
}

/** Returns the debt category ID for the current account, if it exists. */
export async function getDebtCategoryId(): Promise<string | null> {
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const db = await getDb();
  const data = await db.categories.findByNameIlike(accountId, "deuda");
  return data?.id ?? null;
}

/** Returns the "Traspaso" category for the current account, creating it if needed. */
export async function getOrCreateTransferCategory(): Promise<string | null> {
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const db = await getDb();
  const existing = await db.categories.findByNameIlike(accountId, "traspaso");
  if (existing) return existing.id;

  const { data: created } = await db.categories.create({
    name: "Traspaso",
    icon: "🔄",
    color: "#8b5cf6",
    sort_order: 0,
    account_id: accountId,
  });

  return created?.id ?? null;
}

/** Returns the transfer category ID for the current account, if it exists. */
export async function getTransferCategoryId(): Promise<string | null> {
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const db = await getDb();
  const data = await db.categories.findByNameIlike(accountId, "traspaso");
  return data?.id ?? null;
}

export async function deleteCategory(id: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const db = await getDb();
  const { error } = await db.categories.delete(id, accountId);

  if (error) return { error };

  revalidatePath("/settings");
  return { success: true };
}
