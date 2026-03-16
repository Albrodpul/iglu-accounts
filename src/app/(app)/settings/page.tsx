import { getCategories } from "@/actions/categories";
import { getRecurringExpenses } from "@/actions/recurring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Ajustes</h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-medium">
            Total gastos fijos mensuales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-orange-600">
            {formatCurrency(totalRecurring)}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="recurring">
        <TabsList>
          <TabsTrigger value="recurring">Gastos fijos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="recurring" className="mt-4">
          <RecurringList recurring={recurring} categories={categories} />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoryList categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
