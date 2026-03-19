import { getCategories } from "@/actions/categories";
import { getRecurringExpenses } from "@/actions/recurring";
import { getAccounts, hasInvestmentsEnabled } from "@/actions/accounts";
import { getUserPasskeys } from "@/actions/passkeys";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecurringList } from "@/components/settings/recurring-list";
import { CategoryList } from "@/components/settings/category-list";
import { ModulesSettings } from "@/components/settings/modules-settings";
import { PasskeysSettings } from "@/components/settings/passkeys-settings";
import { AccountsSettings } from "@/components/settings/accounts-settings";
import { formatCurrency } from "@/lib/format";

export default async function SettingsPage() {
  const [categories, recurring, hasInvestments, passkeys, accounts] = await Promise.all([
    getCategories(),
    getRecurringExpenses(),
    hasInvestmentsEnabled(),
    getUserPasskeys(),
    getAccounts(),
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
        <TabsList className="grid w-full grid-cols-3 md:w-[480px]">
          <TabsTrigger value="recurring">Mov. fijos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="modules">Configuración</TabsTrigger>
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

        <TabsContent value="modules" className="mt-5">
          <div className="space-y-4">
            <div className="glass-panel p-5 md:p-6">
              <AccountsSettings accounts={accounts} />
            </div>
            <div className="glass-panel p-5 md:p-6">
              <ModulesSettings hasInvestments={hasInvestments} />
            </div>
            <PasskeysSettings passkeys={passkeys} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
