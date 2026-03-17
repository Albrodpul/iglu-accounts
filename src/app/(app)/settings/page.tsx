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

  const totalRecurring = recurring.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-2xl font-bold md:text-3xl">Ajustes</h1>

      <div className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
          Total gastos fijos mensuales
        </p>
        <p className="mt-2 text-3xl font-bold text-amber-600 tabular-nums">
          {formatCurrency(totalRecurring)}
        </p>
      </div>

      <Tabs defaultValue="recurring">
        <TabsList className="grid w-full grid-cols-2 md:w-[360px]">
          <TabsTrigger value="recurring">Gastos fijos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="recurring" className="mt-5">
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
