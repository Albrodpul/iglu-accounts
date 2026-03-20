"use server";

import { createClient } from "@/lib/supabase/server";
import {
  investmentTypeSchema,
  investmentFundCreateSchema,
  investmentContributionSchema,
} from "@/lib/validators/expense";
import { revalidatePath } from "next/cache";
import { getSelectedAccountId } from "./accounts";

const REVALIDATE_PATHS = ["/investments", "/dashboard"];

function revalidateAll() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

// ─── Investment Types ───

export async function getInvestmentTypes() {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return [];

  const { data, error } = await supabase
    .from("investment_types")
    .select("*")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createInvestmentType(formData: FormData) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const parsed = investmentTypeSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("investment_types").insert({
    ...parsed.data,
    account_id: accountId,
  });

  if (error) return { error: error.message };

  revalidateAll();
  return { success: true };
}

export async function updateInvestmentType(id: string, formData: FormData) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const parsed = investmentTypeSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("investment_types")
    .update({ ...parsed.data })
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  revalidateAll();
  return { success: true };
}

export async function deleteInvestmentType(id: string) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const { data: associatedFunds } = await supabase
    .from("investment_funds")
    .select("id")
    .eq("type_id", id)
    .eq("account_id", accountId)
    .limit(1);

  if (associatedFunds && associatedFunds.length > 0) {
    return { error: "No puedes eliminar un tipo con fondos asociados. Elimina los fondos primero." };
  }

  const { error } = await supabase
    .from("investment_types")
    .delete()
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  revalidateAll();
  return { success: true };
}

// ─── Investment Funds ───

export async function getInvestmentFunds() {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return [];

  const { data, error } = await supabase
    .from("investment_funds")
    .select("*, investment_type:investment_types(*)")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createInvestmentFund(formData: FormData) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const initialAmount = parseFloat(formData.get("initial_amount") as string) || 0;

  const parsed = investmentFundCreateSchema.safeParse({
    name: formData.get("name"),
    type_id: formData.get("type_id"),
    initial_amount: initialAmount,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { initial_amount, ...fundData } = parsed.data;

  const { data: fund, error } = await supabase
    .from("investment_funds")
    .insert({
      ...fundData,
      invested_amount: initial_amount,
      current_value: initial_amount,
      account_id: accountId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Create initial contribution
  if (initial_amount > 0 && fund) {
    const contribDate = (formData.get("contribution_date") as string) || new Date().toISOString().split("T")[0];
    await supabase.from("investment_contributions").insert({
      fund_id: fund.id,
      account_id: accountId,
      amount: initial_amount,
      contribution_date: contribDate,
      notes: "Aportación inicial",
    });
  }

  revalidateAll();
  return { success: true };
}

export async function updateInvestmentFund(id: string, formData: FormData) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const { error } = await supabase
    .from("investment_funds")
    .update({
      name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  revalidateAll();
  return { success: true };
}

export async function updateFundProfitability(id: string, formData: FormData) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const raw = formData.get("return_amount") as string;
  const returnAmount = parseFloat(raw);
  if (isNaN(returnAmount)) return { error: "La rentabilidad es obligatoria" };

  // Max 2 decimal places
  const decimals = raw.includes(".") ? raw.split(".")[1]?.length ?? 0 : 0;
  if (decimals > 2) return { error: "Máximo 2 decimales" };

  const { data: fund } = await supabase
    .from("investment_funds")
    .select("invested_amount")
    .eq("id", id)
    .eq("account_id", accountId)
    .single();

  if (!fund) return { error: "Fondo no encontrado" };

  const currentValue = fund.invested_amount + returnAmount;

  const { error } = await supabase
    .from("investment_funds")
    .update({
      current_value: currentValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  revalidateAll();
  return { success: true };
}

export async function deleteInvestmentFund(id: string) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const { error } = await supabase
    .from("investment_funds")
    .delete()
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  revalidateAll();
  return { success: true };
}

// ─── Contributions (DCA tracking) ───

export async function getContributions(fundId: string) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return [];

  const { data, error } = await supabase
    .from("investment_contributions")
    .select("*")
    .eq("fund_id", fundId)
    .eq("account_id", accountId)
    .order("contribution_date", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createContribution(formData: FormData) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const amount = parseFloat(formData.get("amount") as string) || 0;

  const parsed = investmentContributionSchema.safeParse({
    fund_id: formData.get("fund_id"),
    amount,
    contribution_date: formData.get("contribution_date"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Insert contribution
  const { error: contribError } = await supabase
    .from("investment_contributions")
    .insert({
      ...parsed.data,
      account_id: accountId,
    });

  if (contribError) return { error: contribError.message };

  // Update fund invested_amount and current_value (increment both to preserve rentabilidad)
  const { data: fund } = await supabase
    .from("investment_funds")
    .select("invested_amount, current_value")
    .eq("id", parsed.data.fund_id)
    .single();

  if (fund) {
    await supabase
      .from("investment_funds")
      .update({
        invested_amount: fund.invested_amount + parsed.data.amount,
        current_value: fund.current_value + parsed.data.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.fund_id);
  }

  revalidateAll();
  return { success: true };
}

export async function updateContribution(id: string, formData: FormData) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const newAmount = parseFloat(formData.get("amount") as string) || 0;
  const contributionDate = formData.get("contribution_date") as string;
  const notes = (formData.get("notes") as string) || null;

  if (newAmount <= 0) return { error: "El importe debe ser positivo" };
  if (!contributionDate) return { error: "La fecha es obligatoria" };

  // Get old contribution to compute diff
  const { data: oldContrib } = await supabase
    .from("investment_contributions")
    .select("amount, fund_id")
    .eq("id", id)
    .eq("account_id", accountId)
    .single();

  if (!oldContrib) return { error: "Aportación no encontrada" };

  const diff = newAmount - oldContrib.amount;

  // Update contribution
  const { error } = await supabase
    .from("investment_contributions")
    .update({ amount: newAmount, contribution_date: contributionDate, notes })
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  // Adjust fund invested_amount and current_value by the diff
  if (diff !== 0) {
    const { data: fund } = await supabase
      .from("investment_funds")
      .select("invested_amount, current_value")
      .eq("id", oldContrib.fund_id)
      .single();

    if (fund) {
      await supabase
        .from("investment_funds")
        .update({
          invested_amount: Math.max(0, fund.invested_amount + diff),
          current_value: Math.max(0, fund.current_value + diff),
          updated_at: new Date().toISOString(),
        })
        .eq("id", oldContrib.fund_id);
    }
  }

  revalidateAll();
  return { success: true };
}

export async function deleteContribution(id: string, fundId: string, amount: number) {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const { error } = await supabase
    .from("investment_contributions")
    .delete()
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  // Decrement fund invested_amount and current_value (both, to preserve rentabilidad)
  const { data: fund } = await supabase
    .from("investment_funds")
    .select("invested_amount, current_value")
    .eq("id", fundId)
    .single();

  if (fund) {
    await supabase
      .from("investment_funds")
      .update({
        invested_amount: Math.max(0, fund.invested_amount - amount),
        current_value: Math.max(0, fund.current_value - amount),
        updated_at: new Date().toISOString(),
      })
      .eq("id", fundId);
  }

  revalidateAll();
  return { success: true };
}

// ─── Investment Summary (for dashboard) ───

export async function getInvestmentSummary() {
  const supabase = await createClient();
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  // Check if account has investments enabled
  const { data: account } = await supabase
    .from("accounts")
    .select("has_investments")
    .eq("id", accountId)
    .single();

  if (!account?.has_investments) return null;

  const { data: funds, error } = await supabase
    .from("investment_funds")
    .select("*, investment_type:investment_types(*)")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  type FundRow = NonNullable<typeof funds>[number];

  // Group by type
  const byType = new Map<string, {
    name: string;
    totalInvested: number;
    totalValue: number;
    funds: FundRow[];
  }>();

  for (const fund of funds || []) {
    const typeName = fund.investment_type?.name || "Sin tipo";
    const existing = byType.get(typeName) || {
      name: typeName,
      totalInvested: 0,
      totalValue: 0,
      funds: [] as FundRow[],
    };
    existing.totalInvested += fund.invested_amount;
    existing.totalValue += fund.current_value;
    existing.funds.push(fund);
    byType.set(typeName, existing);
  }

  const totalInvested = (funds || []).reduce((s, f) => s + f.invested_amount, 0);
  const totalValue = (funds || []).reduce((s, f) => s + f.current_value, 0);
  const totalReturn = totalValue - totalInvested;

  return {
    types: Array.from(byType.values()),
    totalInvested,
    totalValue,
    totalReturn,
  };
}
