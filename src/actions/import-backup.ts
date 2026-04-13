"use server";

import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSelectedAccountId } from "./accounts";
import type { BackupData } from "./export";

export type ImportBackupResult = {
  error?: string;
  categories?: { imported: number; existing: number };
  expenses?: { imported: number; skipped: number };
  recurring?: { imported: number; skipped: number };
  investments?: { types: number; funds: number; contributions: number };
};

export async function importBackup(formData: FormData): Promise<ImportBackupResult> {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Selecciona un fichero .json" };
  if (!file.name.toLowerCase().endsWith(".json")) return { error: "Solo se permite fichero .json" };

  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  let backup: BackupData;
  try {
    const text = await file.text();
    backup = JSON.parse(text);
  } catch {
    return { error: "El fichero no es un JSON válido" };
  }

  if (backup.version !== 1) return { error: "Formato de copia de seguridad no reconocido (versión incompatible)" };
  if (!Array.isArray(backup.categories) || !Array.isArray(backup.expenses)) {
    return { error: "El fichero no tiene el formato esperado de copia de seguridad" };
  }

  const db = await getDb();

  // --- Categories: match by name, create if missing ---
  const existingCategories = await db.categories.findAll(accountId);
  const existingByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));
  const categoryIdMap = new Map<string, string>();
  let categoriesImported = 0;
  let categoriesExisting = 0;

  for (const cat of backup.categories) {
    const key = cat.name.toLowerCase();
    if (existingByName.has(key)) {
      categoryIdMap.set(cat.id, existingByName.get(key)!);
      categoriesExisting++;
    } else {
      const { data: inserted } = await db.categories.create({
        account_id: accountId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        sort_order: cat.sort_order,
      });
      if (inserted) {
        categoryIdMap.set(cat.id, inserted.id);
        existingByName.set(key, inserted.id);
        categoriesImported++;
      }
    }
  }

  // --- Expenses: deduplicate by (expense_date, amount, concept) ---
  const existingExpenses = await db.expenses.findForDedup(accountId);
  const existingExpenseSet = new Set(
    existingExpenses.map(
      (e) => `${e.expense_date}|${Number(e.amount).toFixed(2)}|${e.concept ?? ""}`,
    ),
  );

  const expensesToInsert = backup.expenses
    .filter((e) => {
      const key = `${e.expense_date}|${Number(e.amount).toFixed(2)}|${e.concept ?? ""}`;
      return !existingExpenseSet.has(key);
    })
    .map((e) => ({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryIdMap.get(e.category_id) ?? null,
      amount: e.amount,
      concept: e.concept,
      expense_date: e.expense_date,
      notes: e.notes,
      payment_method: e.payment_method ?? "bank",
    }))
    .filter((e) => e.category_id !== null);

  let expensesImported = 0;
  const chunkSize = 500;
  for (let i = 0; i < expensesToInsert.length; i += chunkSize) {
    const chunk = expensesToInsert.slice(i, i + chunkSize);
    const { error } = await db.expenses.createMany(chunk as Parameters<typeof db.expenses.createMany>[0]);
    if (error) return { error: `Error importando gastos: ${error}` };
    expensesImported += chunk.length;
  }

  const expensesSkipped = backup.expenses.length - expensesToInsert.length;

  // --- Recurring expenses: deduplicate by (day_of_month, concept, amount) ---
  const existingRecurring = await db.recurring.findForDedup(accountId);
  const existingRecurringSet = new Set(
    existingRecurring.map(
      (r) => `${r.day_of_month}|${r.concept}|${Number(r.amount).toFixed(2)}`,
    ),
  );

  const recurringToInsert = (backup.recurring_expenses ?? [])
    .filter(
      (r) =>
        !existingRecurringSet.has(
          `${r.day_of_month}|${r.concept}|${Number(r.amount).toFixed(2)}`,
        ),
    )
    .map((r) => ({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryIdMap.get(r.category_id) ?? null,
      amount: r.amount,
      concept: r.concept,
      day_of_month: r.day_of_month,
      schedule_type: r.schedule_type,
      is_active: r.is_active,
    }))
    .filter((r) => r.category_id !== null);

  let recurringImported = 0;
  if (recurringToInsert.length > 0) {
    const { error } = await db.recurring.createMany(
      recurringToInsert as Parameters<typeof db.recurring.createMany>[0],
    );
    if (error) return { error: `Error importando recurrentes: ${error}` };
    recurringImported = recurringToInsert.length;
  }
  const recurringSkipped = (backup.recurring_expenses ?? []).length - recurringToInsert.length;

  // --- Investment data (only if account has investments enabled) ---
  let investmentsResult = { types: 0, funds: 0, contributions: 0 };

  if ((backup.investment_types?.length || backup.investment_funds?.length) > 0) {
    const accountData = await db.accounts.findSettings(accountId);

    if (accountData?.has_investments) {
      const existingTypes = await db.investments.findTypesByName(accountId);
      const existingTypesByName = new Map(
        existingTypes.map((t) => [t.name.toLowerCase(), t.id]),
      );
      const typeIdMap = new Map<string, string>();
      let typesImported = 0;

      for (const type of backup.investment_types ?? []) {
        const key = type.name.toLowerCase();
        if (existingTypesByName.has(key)) {
          typeIdMap.set(type.id, existingTypesByName.get(key)!);
        } else {
          const { error } = await db.investments.createType({
            account_id: accountId,
            name: type.name,
            sort_order: type.sort_order,
          });
          if (!error) {
            // Re-fetch to get the new id
            const refreshed = await db.investments.findTypesByName(accountId);
            const newEntry = refreshed.find((t) => t.name.toLowerCase() === key);
            if (newEntry) {
              typeIdMap.set(type.id, newEntry.id);
              existingTypesByName.set(key, newEntry.id);
              typesImported++;
            }
          }
        }
      }

      const existingFunds = await db.investments.findFundsByName(accountId);
      const existingFundsByName = new Map(
        existingFunds.map((f) => [f.name.toLowerCase(), f.id]),
      );
      const fundIdMap = new Map<string, string>();
      let fundsImported = 0;

      for (const fund of backup.investment_funds ?? []) {
        const key = fund.name.toLowerCase();
        const mappedTypeId = typeIdMap.get(fund.type_id);
        if (!mappedTypeId) continue;

        if (existingFundsByName.has(key)) {
          fundIdMap.set(fund.id, existingFundsByName.get(key)!);
        } else {
          const { data: inserted } = await db.investments.createFund({
            account_id: accountId,
            type_id: mappedTypeId,
            name: fund.name,
            isin: fund.isin ?? null,
            show_negative_returns: fund.show_negative_returns ?? true,
            invested_amount: fund.invested_amount,
            current_value: fund.current_value,
            sort_order: fund.sort_order,
          });
          if (inserted) {
            fundIdMap.set(fund.id, inserted.id);
            existingFundsByName.set(key, inserted.id);
            fundsImported++;
          }
        }
      }

      let contribImported = 0;
      if (backup.investment_contributions?.length && fundIdMap.size > 0) {
        const allFundIds = Array.from(fundIdMap.values());
        const existingContribs = await db.investments.findContributionsForDedup(allFundIds);
        const existingContribSet = new Set(
          existingContribs.map(
            (c) => `${c.fund_id}|${Number(c.amount).toFixed(2)}|${c.contribution_date}`,
          ),
        );

        const contribsToInsert = backup.investment_contributions
          .filter((c) => {
            const mappedFundId = fundIdMap.get(c.fund_id);
            if (!mappedFundId) return false;
            return !existingContribSet.has(
              `${mappedFundId}|${Number(c.amount).toFixed(2)}|${c.contribution_date}`,
            );
          })
          .map((c) => ({
            fund_id: fundIdMap.get(c.fund_id)!,
            account_id: accountId,
            amount: c.amount,
            purchase_price: c.purchase_price ?? null,
            contribution_date: c.contribution_date,
            notes: c.notes,
          }));

        if (contribsToInsert.length > 0) {
          const { error } = await db.investments.createContributions(contribsToInsert);
          if (!error) contribImported = contribsToInsert.length;
        }
      }

      investmentsResult = {
        types: typesImported,
        funds: fundsImported,
        contributions: contribImported,
      };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/summary");
  revalidatePath("/investments");
  revalidatePath("/settings");

  return {
    categories: { imported: categoriesImported, existing: categoriesExisting },
    expenses: { imported: expensesImported, skipped: expensesSkipped },
    recurring: { imported: recurringImported, skipped: recurringSkipped },
    investments: investmentsResult,
  };
}
