"use server";

import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";
import { redirect } from "next/navigation";
import { getSelectedAccountId } from "./accounts";

export type BackupData = {
  version: 1;
  exportedAt: string;
  account: {
    id: string;
    name: string;
    has_investments: boolean;
  };
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    sort_order: number;
  }>;
  expenses: Array<{
    id: string;
    category_id: string;
    amount: number;
    concept: string;
    expense_date: string;
    notes: string | null;
    payment_method: string;
    transfer_pair_id: string | null;
  }>;
  recurring_expenses: Array<{
    id: string;
    category_id: string;
    amount: number;
    concept: string;
    day_of_month: number;
    schedule_type: string;
    is_active: boolean;
  }>;
  investment_types: Array<{
    id: string;
    name: string;
    sort_order: number;
  }>;
  investment_funds: Array<{
    id: string;
    type_id: string;
    name: string;
    isin: string | null;
    show_negative_returns: boolean;
    invested_amount: number;
    current_value: number;
    sort_order: number;
  }>;
  investment_contributions: Array<{
    id: string;
    fund_id: string;
    amount: number;
    purchase_price: number | null;
    contribution_date: string;
    notes: string | null;
  }>;
};

export async function exportAccountData(): Promise<{ data?: BackupData; error?: string }> {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const db = await getDb();

  const account = await db.accounts.findById(accountId);
  if (!account) return { error: "No se pudo obtener la cuenta" };

  const categories = await db.categories.findAll(accountId);
  const expenses = await db.expenses.findForBackup(accountId);
  if (!expenses) return { error: "Error al exportar gastos" };

  const recurring = await db.recurring.findForBackup(accountId);
  if (!recurring) return { error: "Error al exportar recurrentes" };

  let investmentTypes: BackupData["investment_types"] = [];
  let investmentFunds: BackupData["investment_funds"] = [];
  let investmentContributions: BackupData["investment_contributions"] = [];

  if (account.has_investments) {
    const types = await db.investments.findTypesForBackup(accountId);
    if (!types) return { error: "Error al exportar tipos de inversión" };
    investmentTypes = types;

    const funds = await db.investments.findFundsForBackup(accountId);
    if (!funds) return { error: "Error al exportar fondos" };
    investmentFunds = funds;

    if (investmentFunds.length > 0) {
      const fundIds = investmentFunds.map((f) => f.id);
      const contributions = await db.investments.findContributionsForBackup(fundIds);
      if (!contributions) return { error: "Error al exportar aportaciones" };
      investmentContributions = contributions;
    }
  }

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    account: {
      id: account.id,
      name: account.name,
      has_investments: account.has_investments,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      sort_order: c.sort_order,
    })),
    expenses: expenses.map((e) => ({
      id: e.id,
      category_id: e.category_id,
      amount: Number(e.amount),
      concept: e.concept,
      expense_date: e.expense_date,
      notes: e.notes ?? null,
      payment_method: e.payment_method ?? "bank",
      transfer_pair_id: e.transfer_pair_id ?? null,
    })),
    recurring_expenses: recurring.map((r) => ({
      id: r.id,
      category_id: r.category_id,
      amount: Number(r.amount),
      concept: r.concept,
      day_of_month: r.day_of_month,
      schedule_type: r.schedule_type,
      is_active: r.is_active,
    })),
    investment_types: investmentTypes,
    investment_funds: investmentFunds,
    investment_contributions: investmentContributions,
  };

  return { data: backup };
}
