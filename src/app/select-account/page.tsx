import Image from "next/image";
import { getAccounts, selectAccount } from "@/actions/accounts";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SelectAccountForm } from "@/components/select-account/select-account-form";

export default async function SelectAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const accounts = await getAccounts();

  if (accounts.length === 0) {
    redirect("/dashboard");
  }

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
        </div>
      </div>
    </div>
  );
}
