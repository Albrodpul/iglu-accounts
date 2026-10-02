import { getCategories } from "@/actions/categories";
import { getRecurringExpenses } from "@/actions/recurring";
import { RecurringList } from "@/components/settings/recurring-list";
import { Amount } from "@/components/ui/amount";

export default async function RecurringPage() {
  const [categories, recurring] = await Promise.all([getCategories(), getRecurringExpenses()]);

  const totalExpenses = recurring.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);
  const totalIncome = recurring.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-2xl font-bold md:text-3xl">Movimientos fijos</h1>

      <div className="grid grid-cols-2 gap-3 md:max-w-2xl">
        <div className="surface-card p-5">
          <p className="text-sm font-semibold text-muted-foreground">Gastos fijos/mes</p>
          <p className="mt-1 text-2xl font-extrabold text-expense tabular-nums md:text-3xl">
            <Amount value={totalExpenses} />
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm font-semibold text-muted-foreground">Ingresos fijos/mes</p>
          <p className="mt-1 text-2xl font-extrabold text-income tabular-nums md:text-3xl">
            <Amount value={totalIncome} />
          </p>
        </div>
      </div>

      <div className="glass-panel p-5 md:max-w-2xl md:p-6">
        <RecurringList recurring={recurring} categories={categories} />
      </div>
    </div>
  );
}
