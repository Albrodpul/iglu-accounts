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

export type MonthSummaryKpi = {
  label: string;
  value: number;
  labelColor: string;
  valueColor: string;
  href?: string;
};

export type BalanceYearKpi = {
  label: string;
  value: number;
  color: string;
};

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
      labelColor: "text-white/75",
      valueColor: "text-emerald-300",
    },
    {
      label: "Gastos",
      value: totalExpenses,
      labelColor: "text-white/75",
      valueColor: "text-rose-300",
    },
  ];

  if (totalDebt > 0 && debtCategoryId) {
    kpis.push({
      label: "Deudas",
      value: totalDebt,
      labelColor: "text-white/75",
      valueColor: "text-sky-300",
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
    { label: "Media/mes", value: avgMonthlyExpense, color: "amber" },
  ];

  if (totalDebt > 0) {
    kpis.push({ label: "Deudas", value: totalDebt, color: "sky" });
  } else {
    kpis.push({ label: "Fijos/mes", value: fixedExpenses, color: "emerald" });
  }

  return kpis;
}
