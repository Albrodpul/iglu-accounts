import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { getAccounts, getSelectedAccountId, selectAccount } from "@/actions/accounts";
import { signOut } from "@/actions/auth";
import { getAuthUser } from "@/lib/db/auth";
import { redirect } from "next/navigation";
import { SelectAccountForm } from "@/components/select-account/select-account-form";
import { Button } from "@/components/ui/button";

export default async function SelectAccountPage() {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  const [accounts, currentAccountId] = await Promise.all([
    getAccounts(),
    getSelectedAccountId(),
  ]);

  if (accounts.length === 0) {
    redirect("/dashboard");
  }

  const hasActiveAccount = !!currentAccountId;

  async function handleSelectAccount(formData: FormData) {
    "use server";
    const accountId = formData.get("account_id");
    if (typeof accountId !== "string" || !accountId) return;
    await selectAccount(accountId);
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Panel decorativo - solo desktop */}
      <div className="hidden lg:flex hero-surface relative items-center justify-center overflow-hidden rounded-none border-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(126,200,240,0.25),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="relative flex flex-col items-center gap-6 px-12 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg">
            <Image src="/iglu.svg" alt="Iglú" width={64} height={64} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Iglú Management</h1>
            <p className="mt-2 text-base text-white/70">
              Gestión de gastos y finanzas personales
            </p>
          </div>
        </div>
      </div>

      {/* Panel selección de cuenta */}
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/12 lg:hidden">
              <Image src="/iglu.svg" alt="Iglú" width={36} height={36} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight lg:text-xl">
                <span className="lg:hidden">Iglú Management</span>
                <span className="hidden lg:inline">Selecciona una cuenta</span>
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                <span className="lg:hidden">Selecciona una cuenta para continuar</span>
                <span className="hidden lg:inline">Elige con qué cuenta quieres trabajar</span>
              </p>
            </div>
          </div>

          <SelectAccountForm
            accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
            action={handleSelectAccount}
          />

          <div className="flex items-center gap-2 pt-2">
            {hasActiveAccount && (
              <Link href="/dashboard" className="inline-flex flex-1 shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ArrowLeft className="size-4" />
                Volver
              </Link>
            )}
            <form action={signOut} className={hasActiveAccount ? "flex-1" : "w-full"}>
              <Button type="submit" variant="ghost" size="sm" className="w-full text-muted-foreground">
                <LogOut className="size-4" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
