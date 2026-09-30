type ExpenseLike = {
  amount: number;
  category_id: string;
};

export type FinancialTotals = {
  totalExpenses: number;
  totalIncome: number;
  totalDebt: number;
  net: number;
};

/** Semantic tone of a KPI; each surface (dark hero / light card) maps it to its own colours. */
export type KpiColor = "emerald" | "rose" | "amber" | "sky";

export type Kpi = {
  label: string;
  value: number;
  color: KpiColor;
  href?: string;
};

export type MonthSummaryKpi = Kpi;
export type BalanceYearKpi = Kpi;

export function calculateFinancialTotals(
  expenses: ExpenseLike[],
  debtCategoryId: string | null,
  transferCategoryId?: string | null,
): FinancialTotals {
  const isTransfer = (e: ExpenseLike) => transferCategoryId && e.category_id === transferCategoryId;

  const totalExpenses = expenses
    .filter((e) => e.amount < 0 && !isTransfer(e))
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = expenses
    .filter((e) => e.amount > 0 && e.category_id !== debtCategoryId && !isTransfer(e))
    .reduce((sum, e) => sum + e.amount, 0);

  const totalDebt = debtCategoryId
    ? expenses
        .filter((e) => e.category_id === debtCategoryId)
        .reduce((sum, e) => sum + e.amount, 0)
    : 0;

  return {
    totalExpenses,
    totalIncome,
    totalDebt,
    net: totalExpenses + totalIncome,
  };
}

export function buildMonthSummaryKpis({
  totalIncome,
  totalExpenses,
  totalDebt,
  debtCategoryId,
  month,
  year,
}: {
  totalIncome: number;
  totalExpenses: number;
  totalDebt: number;
  debtCategoryId: string | null;
  month: number;
  year: number;
}): MonthSummaryKpi[] {
  const kpis: MonthSummaryKpi[] = [
    {
      label: "Ingresos",
      value: totalIncome,
      color: "emerald",
    },
    {
      label: "Gastos",
      value: totalExpenses,
      color: "rose",
    },
  ];

  if (totalDebt > 0 && debtCategoryId) {
    kpis.push({
      label: "Deudas",
      value: totalDebt,
      color: "amber",
      href: `/expenses?month=${month}&year=${year}&category=${debtCategoryId}`,
    });
  }

  return kpis;
}

export function buildBalanceYearKpis({
  totalIncome,
  totalExpenses,
  totalDebt,
  avgMonthlyExpense,
  fixedExpenses,
}: {
  totalIncome: number;
  totalExpenses: number;
  totalDebt: number;
  avgMonthlyExpense: number;
  fixedExpenses: number;
}): BalanceYearKpi[] {
  const kpis: BalanceYearKpi[] = [
    { label: "Ingresos", value: totalIncome, color: "emerald" },
    { label: "Gastos", value: totalExpenses, color: "rose" },
    { label: "Media/mes", value: avgMonthlyExpense, color: "sky" },
  ];

  if (totalDebt > 0) {
    kpis.push({ label: "Deudas", value: totalDebt, color: "amber" });
  } else {
    kpis.push({ label: "Fijos/mes", value: fixedExpenses, color: "emerald" });
  }

  return kpis;
}
