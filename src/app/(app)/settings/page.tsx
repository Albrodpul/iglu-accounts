import { getCategories } from "@/actions/categories";
import { getRecurringExpenses } from "@/actions/recurring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecurringList } from "@/components/settings/recurring-list";
import { CategoryList } from "@/components/settings/category-list";
import { formatCurrency } from "@/lib/format";

export default async function SettingsPage() {
  const [categories, recurring] = await Promise.all([
    getCategories(),
    getRecurringExpenses(),
  ]);

  const totalExpenses = recurring
    .filter((r) => r.amount < 0)
    .reduce((s, r) => s + r.amount, 0);
  const totalIncome = recurring
    .filter((r) => r.amount > 0)
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-2xl font-bold md:text-3xl">Ajustes</h1>

      <Tabs defaultValue="recurring">
        <TabsList className="grid w-full grid-cols-2 md:w-[360px]">
          <TabsTrigger value="recurring">Movimientos fijos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="recurring" className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">
                Gastos fijos/mes
              </p>
              <p className="mt-2 text-2xl font-bold text-rose-600 tabular-nums md:text-3xl">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="glass-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                Ingresos fijos/mes
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-600 tabular-nums md:text-3xl">
                {formatCurrency(totalIncome)}
              </p>
            </div>
          </div>
          <div className="glass-panel p-5 md:p-6">
            <RecurringList recurring={recurring} categories={categories} />
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-5">
          <div className="glass-panel p-5 md:p-6">
            <CategoryList categories={categories} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
