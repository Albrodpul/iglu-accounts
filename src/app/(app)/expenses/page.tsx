import { getExpenses } from "@/actions/expenses";
import { getCategories } from "@/actions/categories";
import { ExpenseList } from "@/components/expenses/expense-list";
import { MonthSelector } from "@/components/expenses/month-selector";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, MONTHS } from "@/lib/format";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

type Props = {
  searchParams: Promise<{ month?: string; year?: string }>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year) : now.getFullYear();

  const [expenses, categories] = await Promise.all([
    getExpenses({ month, year }),
    getCategories(),
  ]);

  const totalExpenses = expenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const totalIncome = expenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const neto = totalExpenses + totalIncome;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gastos</h2>
        <MonthSelector month={month} year={year} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${neto >= 0 ? "border-l-blue-500" : "border-l-orange-500"}`}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-blue-500" />
              Neto
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className={`text-lg font-bold ${neto >= 0 ? "text-blue-600" : "text-orange-600"}`}>
              {formatCurrency(neto)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {MONTHS[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseList expenses={expenses} categories={categories} />
        </CardContent>
      </Card>

      <AddExpenseFab categories={categories} />
    </div>
  );
}
