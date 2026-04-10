"use server";

import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";
import { recurringExpenseSchema } from "@/lib/validators/expense";
import { parseSignedAmount } from "@/lib/amounts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSelectedAccountId } from "./accounts";
import { getOrCreateIncomeCategory } from "./categories";
import { getScheduledDay } from "@/lib/recurring";

export async function getRecurringExpenses() {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  return db.recurring.findActive(accountId);
}

export async function createRecurringExpense(formData: FormData) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const amount = parseSignedAmount(formData);
  const isIncome = formData.get("is_income") === "true";
  const scheduleType = (formData.get("schedule_type") as string) || "monthly";
  const dayValue = formData.get("day_of_month") as string;
  const categoryValue = formData.get("category_id");
  let categoryId =
    typeof categoryValue === "string" && categoryValue.trim().length > 0
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
  const db = await getDb();
  const { error } = await db.recurring.create({
    ...parsed.data,
    user_id: user.id,
    account_id: accountId,
  });

  if (error) return { error };

  revalidatePath("/settings");
  revalidatePath("/summary");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateRecurringExpense(id: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const amount = parseSignedAmount(formData);
  const isIncome = formData.get("is_income") === "true";
  const scheduleType = (formData.get("schedule_type") as string) || "monthly";
  const dayValue = formData.get("day_of_month") as string;
  const categoryValue = formData.get("category_id");
  let categoryId =
    typeof categoryValue === "string" && categoryValue.trim().length > 0
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

  const db = await getDb();
  const { error } = await db.recurring.update(id, user.id, {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error };

  revalidatePath("/settings");
  revalidatePath("/summary");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function triggerRecurringExpenses() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const accountId = await getSelectedAccountId();
  const db = await getDb();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const recurring = await db.recurring.findActiveForUser(user.id, accountId);

  if (!recurring) return { error: "Error al obtener movimientos fijos" };
  if (recurring.length === 0) {
    return { error: "No hay movimientos fijos configurados" };
  }

  const startDate = `${monthStr}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const existingNotes = await db.expenses.findRecurringNotesInRange(accountId, startDate, endDate);

  const alreadyInserted = new Set(
    existingNotes
      .map((e) => e.notes?.replace("auto:recurring:", ""))
      .filter(Boolean),
  );

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

  const { error: insertError } = await db.expenses.createMany(toInsert);

  if (insertError) return { error: insertError };

  // Send push notifications
  try {
    if (accountId) {
      const account = await db.accounts.findForNotifications(accountId);

      if (account?.notifications_enabled) {
        const subscriptions = await db.notifications.findByUser(user.id);

        if (subscriptions && subscriptions.length > 0) {
          const { sendPushToMany, formatRecurringPushBody } = await import("@/lib/web-push");
          const body = formatRecurringPushBody(toInsert);
          const result = await sendPushToMany(subscriptions, {
            title: account.name || "Iglu",
            body,
            url: "/expenses",
          });

          if (result.expired.length > 0) {
            await db.notifications.deleteByEndpoints(result.expired);
          }
        }
      }
    }
  } catch {
    // Push errors should not block the action
  }

  revalidatePath("/settings");
  revalidatePath("/summary");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return {
    inserted: toInsert.length,
    message: `${toInsert.length} movimiento(s) fijo(s) insertado(s)`,
  };
}

export async function deleteRecurringExpense(id: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const { error } = await db.recurring.deactivate(id, user.id);

  if (error) return { error };

  revalidatePath("/settings");
  revalidatePath("/summary");
  revalidatePath("/dashboard");
  return { success: true };
}
