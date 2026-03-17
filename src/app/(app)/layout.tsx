import { Navbar } from "@/components/layout/navbar";
import { getAccounts, getSelectedAccountId } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [accounts, selectedAccountId, categories] = await Promise.all([
    getAccounts(),
    getSelectedAccountId(),
    getCategories(),
  ]);

  const currentAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar accountName={currentAccount?.name} showAccountSwitcher={accounts.length > 1} categories={categories} />
      <main className="pb-24 md:ml-[18rem] md:pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-8">
          <div className="page-enter">{children}</div>
        </div>
      </main>
    </div>
  );
}
