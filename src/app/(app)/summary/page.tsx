import { getExpensesByYear } from "@/actions/expenses";
import { getRecurringExpenses } from "@/actions/recurring";
import { getCategories } from "@/actions/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, MONTHS } from "@/lib/format";
import { YearSelector } from "@/components/summary/year-selector";
import { MonthlyChart } from "@/components/summary/monthly-chart";
import { CategoryBreakdown } from "@/components/summary/category-breakdown";

type Props = {
  searchParams: Promise<{ year?: string }>;
};

export default async function SummaryPage({ searchParams }: Props) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year) : new Date().getFullYear();

  const [expenses, recurring, categories] = await Promise.all([
    getExpensesByYear(year),
    getRecurringExpenses(),
    getCategories(),
  ]);

  // Monthly totals
  const monthlyData = MONTHS.map((name, i) => {
    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === i;
    });

    const gastos = monthExpenses
      .filter((e) => e.amount < 0)
      .reduce((s, e) => s + e.amount, 0);
    const ingresos = monthExpenses
      .filter((e) => e.amount > 0)
      .reduce((s, e) => s + e.amount, 0);

    return {
      name: name.substring(0, 3),
      gastos: Math.abs(gastos),
      ingresos,
      neto: gastos + ingresos,
    };
  });

  // Category breakdown for the year
  const categoryTotals = categories
    .map((cat) => {
      const total = expenses
        .filter((e) => e.category_id === cat.id && e.amount < 0)
        .reduce((s, e) => s + Math.abs(e.amount), 0);
      return { name: cat.name, color: cat.color || "#64748b", icon: cat.icon || "", total };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalExpenses = expenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const totalIncome = expenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const totalRecurring = recurring.reduce((s, r) => s + r.amount, 0) * 12;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Resumen anual</h2>
        <YearSelector year={year} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              Total gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              Total ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              Gastos fijos (anual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-orange-600">
              {formatCurrency(totalRecurring)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              Neto año
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-lg font-bold ${
                totalExpenses + totalIncome >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(totalExpenses + totalIncome)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gastos vs Ingresos por mes</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyChart data={monthlyData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBreakdown data={categoryTotals} />
        </CardContent>
      </Card>
    </div>
  );
}
