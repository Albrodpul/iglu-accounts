import { getExpenses, getExpensesByYear } from "@/actions/expenses";
import { getRecurringExpenses } from "@/actions/recurring";
import { getCategories } from "@/actions/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, MONTHS } from "@/lib/format";
import { ExpenseList } from "@/components/expenses/expense-list";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  CalendarDays,
} from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [monthExpenses, yearExpenses, recurring, categories] = await Promise.all([
    getExpenses({ month, year }),
    getExpensesByYear(year),
    getRecurringExpenses(),
    getCategories(),
  ]);

  // Month stats
  const monthGastos = monthExpenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const monthIngresos = monthExpenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const monthNeto = monthGastos + monthIngresos;

  // Year stats
  const yearGastos = yearExpenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const yearIngresos = yearExpenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const yearNeto = yearGastos + yearIngresos;

  // Recurring total
  const totalRecurring = recurring.reduce((s, r) => s + r.amount, 0);

  // Recent expenses (last 10)
  const recentExpenses = [...monthExpenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Year summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Resumen {year}</h2>
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
                {formatCurrency(yearGastos)}
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
                {formatCurrency(yearIngresos)}
              </p>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${yearNeto >= 0 ? "border-l-blue-500" : "border-l-orange-500"}`}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-blue-500" />
                Neto
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className={`text-lg font-bold ${yearNeto >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                {formatCurrency(yearNeto)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Month summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-5 w-5 text-primary/70" />
          <h2 className="text-lg font-bold text-foreground">
            {MONTHS[month - 1]}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                Gastos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-base font-bold text-red-600">
                {formatCurrency(monthGastos)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-base font-bold text-emerald-600">
                {formatCurrency(monthIngresos)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                Gastos fijos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-base font-bold text-amber-600">
                {formatCurrency(totalRecurring)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                Neto mes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className={`text-base font-bold ${monthNeto >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(monthNeto)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseList expenses={recentExpenses} categories={categories} />
        </CardContent>
      </Card>

      {/* Floating action button */}
      <AddExpenseFab categories={categories} />
    </div>
  );
}
