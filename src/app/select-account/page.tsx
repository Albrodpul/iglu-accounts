import { getAccounts, selectAccount } from "@/actions/accounts";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(16,185,129,0.15),transparent_35%),radial-gradient(circle_at_80%_24%,rgba(14,165,233,0.12),transparent_38%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
      <Card className="w-full border-border/70 bg-card/90 shadow-[0_20px_45px_-24px_rgba(8,47,45,0.65)] backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <span className="text-2xl">🛖</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Iglú Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Selecciona una cuenta
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {accounts.map((account) => (
            <form
              key={account.id}
              action={async () => {
                "use server";
                await selectAccount(account.id);
              }}
            >
              <button
                type="submit"
                className="w-full rounded-xl border border-border/80 bg-card px-4 py-3.5 text-left text-sm font-medium transition-colors hover:bg-muted/60"
              >
                {account.name}
              </button>
            </form>
          ))}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
