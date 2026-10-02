"use server";

import { cache } from "react";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";
import { recurringExpenseSchema } from "@/lib/validators/expense";
import { parseSignedAmount } from "@/lib/amounts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSelectedAccountId } from "./accounts";
import { daysAgo, toLocalISODate } from "@/lib/dates";
import type { RecurringExpenseWithCategory } from "@/types";
import { getOrCreateIncomeCategory } from "./categories";
import {
  getScheduledDay,
  getExpenseDay,
  getPendingThisMonth,
  recurringIdsFromNotes,
  recurringMarker,
} from "@/lib/recurring";

function parseExpenseOverride(formData: FormData) {
  const rawType = formData.get("expense_schedule_type");
  const expense_schedule_type =
    typeof rawType === "string" && rawType.length > 0 ? rawType : null;
  const rawDay = formData.get("expense_day_of_month");
  const expense_day_of_month =
    typeof rawDay === "string" && rawDay.length > 0 ? parseInt(rawDay) : null;
  return { expense_schedule_type, expense_day_of_month };
}

const findRecurringCached = cache(async (accountId: string | null) => {
  const db = await getDb();
  return db.recurring.findActive(accountId);
});

export async function getRecurringExpenses() {
  const accountId = await getSelectedAccountId();
  return findRecurringCached(accountId);
}

/** Fixed movements that will still be charged in the current month. */
export async function getPendingRecurring() {
  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const [recurring, existingNotes] = await Promise.all([
    findRecurringCached(accountId),
    db.expenses.findRecurringNotesInRange(accountId, `${monthStr}-01`, nextMonth),
  ]);
  return getPendingThisMonth(
    recurring as RecurringExpenseWithCategory[],
    recurringIdsFromNotes(existingNotes),
    year,
    month,
    now.getDate(),
  );
}

/**
 * Turns one pending fixed movement into a real movement dated `date` (the
 * user's today), tagged so this month's automatic charge skips it.
 */
export async function chargeRecurringNow(recurringId: string, date: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  // `date` comes from the client's clock: accept only "around today".
  const allowed = [-1, 0, 1].map((offset) => toLocalISODate(daysAgo(offset)));
  if (!allowed.includes(date)) return { error: "Fecha no válida" };

  const accountId = await getSelectedAccountId();
  const db = await getDb();
  const recurring = (await findRecurringCached(accountId)).find((r) => r.id === recurringId);
  if (!recurring) return { error: "Movimiento fijo no encontrado" };

  const [year, month] = date.split("-").map(Number);
  const monthStart = `${date.slice(0, 7)}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const existingNotes = await db.expenses.findRecurringNotesInRange(accountId, monthStart, nextMonth);
  if (recurringIdsFromNotes(existingNotes).has(recurring.id)) {
    return { error: "Este movimiento fijo ya está cargado este mes" };
  }

  const { error } = await db.expenses.create({
    user_id: user.id,
    account_id: recurring.account_id,
    category_id: recurring.category_id,
    amount: recurring.amount,
    concept: recurring.concept || (recurring.amount > 0 ? "Ingreso fijo" : "Gasto fijo"),
    expense_date: date,
    notes: recurringMarker(recurring.id),
  });
  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  return { success: true };
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

  const override = parseExpenseOverride(formData);
  const parsed = recurringExpenseSchema.safeParse({
    amount,
    concept: formData.get("concept"),
    category_id: categoryId,
    day_of_month: dayValue ? parseInt(dayValue) : null,
    schedule_type: scheduleType,
    ...override,
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
  revalidatePath("/recurring");
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

  const override = parseExpenseOverride(formData);
  const parsed = recurringExpenseSchema.safeParse({
    amount,
    concept: formData.get("concept"),
    category_id: categoryId,
    day_of_month: dayValue ? parseInt(dayValue) : null,
    schedule_type: scheduleType,
    ...override,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const db = await getDb();
  const { error } = await db.recurring.update(id, user.id, {
    ...parsed.data,
    expense_day_of_month: parsed.data.expense_day_of_month ?? null,
    expense_schedule_type: parsed.data.expense_schedule_type ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error };

  revalidatePath("/settings");
  revalidatePath("/recurring");
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

  const alreadyInserted = recurringIdsFromNotes(existingNotes);

  const toInsert = recurring
    .filter((r) => {
      if (alreadyInserted.has(r.id)) return false;
      const day = getScheduledDay(r, year, month);
      return day !== null && day <= today;
    })
    .map((r) => {
      const expenseDay = getExpenseDay(r, year, month);
      return {
        user_id: user.id,
        account_id: r.account_id,
        category_id: r.category_id,
        amount: r.amount,
        concept: r.concept || (r.amount > 0 ? "Ingreso fijo" : "Gasto fijo"),
        expense_date: `${monthStr}-${String(expenseDay).padStart(2, "0")}`,
        notes: recurringMarker(r.id),
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
  revalidatePath("/recurring");
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
  revalidatePath("/recurring");
  revalidatePath("/summary");
  revalidatePath("/dashboard");
  return { success: true };
}
