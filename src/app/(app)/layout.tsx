import { Navbar } from "@/components/layout/navbar";
import { getAccounts, getSelectedAccountId, setSelectedAccount } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [accounts, selectedAccountId] = await Promise.all([
    getAccounts(),
    getSelectedAccountId(),
  ]);

  // Auto-select first account if none selected or selected one no longer exists
  let effectiveAccountId: string | null = selectedAccountId;
  if (accounts.length > 0 && (!effectiveAccountId || !accounts.find((a) => a.id === effectiveAccountId))) {
    effectiveAccountId = accounts[0].id;
    await setSelectedAccount(accounts[0].id);
  }

  const categories = await getCategories();
  const currentAccount = accounts.find((a) => a.id === effectiveAccountId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        accountName={currentAccount?.name}
        showAccountSwitcher={accounts.length > 1}
        categories={categories}
        hasInvestments={currentAccount?.has_investments ?? false}
      />
      <main className="pt-14 pb-28 md:ml-[18rem] md:pt-0 md:pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-8">
          <div className="page-enter">{children}</div>
        </div>
      </main>
    </div>
  );
}
