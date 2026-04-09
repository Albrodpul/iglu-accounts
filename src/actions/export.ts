"use server";

import { createClient } from "@/lib/supabase/server";
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
    invested_amount: number;
    current_value: number;
    sort_order: number;
  }>;
  investment_contributions: Array<{
    id: string;
    fund_id: string;
    amount: number;
    contribution_date: string;
    notes: string | null;
  }>;
};

export async function exportAccountData(): Promise<{ data?: BackupData; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, name, has_investments")
    .eq("id", accountId)
    .single();
  if (accountError || !account) return { error: "No se pudo obtener la cuenta" };

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, icon, color, sort_order")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: true });
  if (categoriesError) return { error: categoriesError.message };

  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("id, category_id, amount, concept, expense_date, notes, payment_method, transfer_pair_id")
    .eq("account_id", accountId)
    .order("expense_date", { ascending: true });
  if (expensesError) return { error: expensesError.message };

  const { data: recurring, error: recurringError } = await supabase
    .from("recurring_expenses")
    .select("id, category_id, amount, concept, day_of_month, schedule_type, is_active")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });
  if (recurringError) return { error: recurringError.message };

  let investmentTypes: BackupData["investment_types"] = [];
  let investmentFunds: BackupData["investment_funds"] = [];
  let investmentContributions: BackupData["investment_contributions"] = [];

  if (account.has_investments) {
    const { data: types, error: typesError } = await supabase
      .from("investment_types")
      .select("id, name, sort_order")
      .eq("account_id", accountId)
      .order("sort_order", { ascending: true });
    if (typesError) return { error: typesError.message };
    investmentTypes = types ?? [];

    const { data: funds, error: fundsError } = await supabase
      .from("investment_funds")
      .select("id, type_id, name, invested_amount, current_value, sort_order")
      .eq("account_id", accountId)
      .order("sort_order", { ascending: true });
    if (fundsError) return { error: fundsError.message };
    investmentFunds = funds ?? [];

    if (investmentFunds.length > 0) {
      const fundIds = investmentFunds.map((f) => f.id);
      const { data: contributions, error: contribError } = await supabase
        .from("investment_contributions")
        .select("id, fund_id, amount, contribution_date, notes")
        .in("fund_id", fundIds)
        .order("contribution_date", { ascending: true });
      if (contribError) return { error: contribError.message };
      investmentContributions = contributions ?? [];
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
    categories: (categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      sort_order: c.sort_order,
    })),
    expenses: (expenses ?? []).map((e) => ({
      id: e.id,
      category_id: e.category_id,
      amount: Number(e.amount),
      concept: e.concept,
      expense_date: e.expense_date,
      notes: e.notes ?? null,
      payment_method: e.payment_method ?? "bank",
      transfer_pair_id: e.transfer_pair_id ?? null,
    })),
    recurring_expenses: (recurring ?? []).map((r) => ({
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
