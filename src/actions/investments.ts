"use server";

import { getDb } from "@/lib/db";
import {
  investmentTypeSchema,
  investmentFundCreateSchema,
  investmentFundUpdateSchema,
  investmentContributionSchema,
} from "@/lib/validators/expense";
import { fetchNavByIsin, calculateCurrentValue } from "@/lib/nav";
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
  const accountId = await getSelectedAccountId();
  if (!accountId) return [];

  const db = await getDb();
  return db.investments.findTypes(accountId);
}

export async function createInvestmentType(formData: FormData) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const parsed = investmentTypeSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const db = await getDb();
  const { error } = await db.investments.createType({
    ...parsed.data,
    account_id: accountId,
  });

  if (error) return { error };

  revalidateAll();
  return { success: true };
}

export async function updateInvestmentType(id: string, formData: FormData) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const parsed = investmentTypeSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const db = await getDb();
  const { error } = await db.investments.updateType(id, accountId, parsed.data);

  if (error) return { error };

  revalidateAll();
  return { success: true };
}

export async function deleteInvestmentType(id: string) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const db = await getDb();
  const hasFunds = await db.investments.hasFundsForType(id, accountId);

  if (hasFunds) {
    return { error: "No puedes eliminar un tipo con fondos asociados. Elimina los fondos primero." };
  }

  const { error } = await db.investments.deleteType(id, accountId);

  if (error) return { error };

  revalidateAll();
  return { success: true };
}

// ─── Investment Funds ───

export async function getInvestmentFunds() {
  const accountId = await getSelectedAccountId();
  if (!accountId) return [];

  const db = await getDb();
  return db.investments.findFunds(accountId);
}

export async function createInvestmentFund(formData: FormData) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const initialAmount = parseFloat(formData.get("initial_amount") as string) || 0;
  const purchasePriceRaw = formData.get("purchase_price") as string;
  const purchasePrice = purchasePriceRaw ? parseFloat(purchasePriceRaw) : null;

  const isinRaw = (formData.get("isin") as string)?.trim() || null;
  const showNegativeReturns = formData.get("show_negative_returns") !== "false";

  const parsed = investmentFundCreateSchema.safeParse({
    name: formData.get("name"),
    type_id: formData.get("type_id"),
    initial_amount: initialAmount,
    isin: isinRaw || null,
    show_negative_returns: showNegativeReturns,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { initial_amount, isin, show_negative_returns, ...fundData } = parsed.data;

  const db = await getDb();
  const { data: fund, error } = await db.investments.createFund({
    ...fundData,
    isin: isin ?? null,
    show_negative_returns: show_negative_returns ?? true,
    invested_amount: initial_amount,
    current_value: initial_amount,
    account_id: accountId,
  });

  if (error) return { error };

  if (initial_amount > 0 && fund) {
    const contribDate =
      (formData.get("contribution_date") as string) || new Date().toISOString().split("T")[0];
    await db.investments.createContribution({
      fund_id: fund.id,
      account_id: accountId,
      amount: initial_amount,
      purchase_price: purchasePrice && purchasePrice > 0 ? purchasePrice : null,
      contribution_date: contribDate,
      notes: "Aportación inicial",
    });
  }

  revalidateAll();
  return { success: true };
}

export async function updateInvestmentFund(id: string, formData: FormData) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const isinRaw = (formData.get("isin") as string)?.trim() || null;
  const showNegativeReturns = formData.get("show_negative_returns") !== "false";

  const parsed = investmentFundUpdateSchema.safeParse({
    name: formData.get("name"),
    isin: isinRaw || null,
    show_negative_returns: showNegativeReturns,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const db = await getDb();
  const { error } = await db.investments.updateFund(id, accountId, {
    name: parsed.data.name,
    isin: parsed.data.isin ?? null,
    show_negative_returns: parsed.data.show_negative_returns ?? true,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error };

  revalidateAll();
  return { success: true };
}

export async function updateFundProfitability(id: string, formData: FormData) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const raw = formData.get("return_amount") as string;
  const returnAmount = parseFloat(raw);
  if (isNaN(returnAmount)) return { error: "La rentabilidad es obligatoria" };

  const decimals = raw.includes(".") ? raw.split(".")[1]?.length ?? 0 : 0;
  if (decimals > 2) return { error: "Máximo 2 decimales" };

  const db = await getDb();
  const fund = await db.investments.findFundAmounts(id, accountId);

  if (!fund) return { error: "Fondo no encontrado" };

  const { error } = await db.investments.updateFund(id, accountId, {
    current_value: fund.invested_amount + returnAmount,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error };

  revalidateAll();
  return { success: true };
}

export async function deleteInvestmentFund(id: string) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const db = await getDb();
  const { error } = await db.investments.deleteFund(id, accountId);

  if (error) return { error };

  revalidateAll();
  return { success: true };
}

// ─── Contributions (DCA tracking) ───

export async function getContributions(fundId: string) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return [];

  const db = await getDb();
  return db.investments.findContributions(fundId, accountId);
}

export async function createContribution(formData: FormData) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const amount = parseFloat(formData.get("amount") as string) || 0;
  const purchasePriceRaw = formData.get("purchase_price") as string;
  const purchasePrice = purchasePriceRaw ? parseFloat(purchasePriceRaw) : null;

  const parsed = investmentContributionSchema.safeParse({
    fund_id: formData.get("fund_id"),
    amount,
    purchase_price: purchasePrice && purchasePrice > 0 ? purchasePrice : null,
    contribution_date: formData.get("contribution_date"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const db = await getDb();
  const { error: contribError } = await db.investments.createContribution({
    ...parsed.data,
    account_id: accountId,
  });

  if (contribError) return { error: contribError };

  const fund = await db.investments.findFundAmounts(parsed.data.fund_id, accountId);

  if (fund) {
    await db.investments.updateFund(parsed.data.fund_id, accountId, {
      invested_amount: fund.invested_amount + parsed.data.amount,
      current_value: fund.current_value + parsed.data.amount,
      updated_at: new Date().toISOString(),
    });
  }

  revalidateAll();
  return { success: true };
}

export async function updateContribution(id: string, formData: FormData) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const newAmount = parseFloat(formData.get("amount") as string) || 0;
  const contributionDate = formData.get("contribution_date") as string;
  const notes = (formData.get("notes") as string) || null;
  const purchasePriceRaw = formData.get("purchase_price") as string;
  const purchasePrice = purchasePriceRaw ? parseFloat(purchasePriceRaw) : null;

  if (newAmount <= 0) return { error: "El importe debe ser positivo" };
  if (!contributionDate) return { error: "La fecha es obligatoria" };

  const db = await getDb();
  const oldContrib = await db.investments.findContributionById(id, accountId);

  if (!oldContrib) return { error: "Aportación no encontrada" };

  const diff = newAmount - oldContrib.amount;

  const { error } = await db.investments.updateContribution(id, accountId, {
    amount: newAmount,
    purchase_price: purchasePrice && purchasePrice > 0 ? purchasePrice : null,
    contribution_date: contributionDate,
    notes,
  });

  if (error) return { error };

  if (diff !== 0) {
    const fund = await db.investments.findFundAmounts(oldContrib.fund_id, accountId);

    if (fund) {
      await db.investments.updateFund(oldContrib.fund_id, accountId, {
        invested_amount: Math.max(0, fund.invested_amount + diff),
        current_value: Math.max(0, fund.current_value + diff),
        updated_at: new Date().toISOString(),
      });
    }
  }

  revalidateAll();
  return { success: true };
}

export async function deleteContribution(id: string, fundId: string, amount: number) {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { error: "No hay cuenta seleccionada" };

  const db = await getDb();
  const { error } = await db.investments.deleteContribution(id, accountId);

  if (error) return { error };

  const fund = await db.investments.findFundAmounts(fundId, accountId);

  if (fund) {
    await db.investments.updateFund(fundId, accountId, {
      invested_amount: Math.max(0, fund.invested_amount - amount),
      current_value: Math.max(0, fund.current_value - amount),
      updated_at: new Date().toISOString(),
    });
  }

  revalidateAll();
  return { success: true };
}

// ─── Manual NAV refresh (same logic as cron, scoped to current account) ───

export async function refreshInvestmentNav(): Promise<{
  updated: number;
  skipped: number;
  error?: string;
}> {
  const accountId = await getSelectedAccountId();
  if (!accountId) return { updated: 0, skipped: 0, error: "No hay cuenta seleccionada" };

  const db = await getDb();
  const funds = await db.investments.findFundsForNavByAccount(accountId);

  if (funds.length === 0) return { updated: 0, skipped: 0 };

  let updated = 0;
  let skipped = 0;

  for (const fund of funds) {
    const nav = await fetchNavByIsin(fund.isin);
    if (nav === null) { skipped++; continue; }

    // Funds with show_negative_returns=false are managed manually — skip NAV update
    if (!fund.show_negative_returns) { skipped++; continue; }

    const newCurrentValue = calculateCurrentValue(fund.investment_contributions, nav);
    if (newCurrentValue === null) { skipped++; continue; }

    const { error } = await db.investments.updateFund(fund.id, accountId, {
      current_value: Math.round(newCurrentValue * 100) / 100,
      updated_at: new Date().toISOString(),
    });

    if (error) skipped++;
    else updated++;
  }

  revalidateAll();
  return { updated, skipped };
}

// ─── Investment Summary (for dashboard) ───

export async function getInvestmentSummary() {
  const accountId = await getSelectedAccountId();
  if (!accountId) return null;

  const db = await getDb();
  const account = await db.accounts.findSettings(accountId);

  if (!account?.has_investments) return null;

  const funds = await db.investments.findFunds(accountId);

  type FundRow = (typeof funds)[number];

  const byType = new Map<
    string,
    {
      name: string;
      totalInvested: number;
      totalValue: number;
      funds: FundRow[];
    }
  >();

  for (const fund of funds) {
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

  const totalInvested = funds.reduce((s, f) => s + f.invested_amount, 0);
  const totalValue = funds.reduce((s, f) => s + f.current_value, 0);
  const totalReturn = totalValue - totalInvested;

  return {
    types: Array.from(byType.values()),
    totalInvested,
    totalValue,
    totalReturn,
  };
}
