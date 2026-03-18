import { getExpenses, getAvailablePeriods } from "@/actions/expenses";
import { getCategories, getDebtCategoryId } from "@/actions/categories";
import { hasInvestmentsEnabled } from "@/actions/accounts";
import { MonthSelector } from "@/components/expenses/month-selector";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import { MonthSummary } from "@/components/shared/month-summary";
import { ExpenseListFiltered } from "@/components/expenses/expense-list-filtered";
import { MONTHS } from "@/lib/format";

type Props = {
  searchParams: Promise<{ month?: string; year?: string; category?: string }>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const categoryFilter = params.category || "";

  const [expenses, categories, availablePeriods, debtCategoryId, hasInvestments] = await Promise.all([
    getExpenses({ month, year }),
    getCategories(),
    getAvailablePeriods(),
    getDebtCategoryId(),
    hasInvestmentsEnabled(),
  ]);

  const totalExpenses = expenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const totalIncome = expenses
    .filter((e) => e.amount > 0 && e.category_id !== debtCategoryId)
    .reduce((s, e) => s + e.amount, 0);
  const totalDebt = debtCategoryId
    ? expenses.filter((e) => e.category_id === debtCategoryId).reduce((s, e) => s + e.amount, 0)
    : 0;
  const neto = totalExpenses + totalIncome;

  const kpis: { label: string; value: number; labelColor: string; valueColor: string; href?: string }[] = [
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

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Movimientos</h1>
        <MonthSelector month={month} year={year} availablePeriods={availablePeriods} />
      </div>

      <MonthSummary month={month} year={year} neto={neto} kpis={kpis} />

      <section>
        <h2 className="mb-4 text-lg font-semibold md:text-xl">
          Detalle · {MONTHS[month - 1]}
        </h2>
        <div className="glass-panel p-5 md:p-6">
          <ExpenseListFiltered
            expenses={expenses}
            categories={categories}
            initialCategoryFilter={categoryFilter}
            hasInvestments={hasInvestments}
          />
        </div>
      </section>

      <AddExpenseFab categories={categories} hasInvestments={hasInvestments} />
    </div>
  );
}
