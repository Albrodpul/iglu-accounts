import { getAccounts, getSelectedAccountId } from "@/actions/accounts";
import { ImportBackupForm } from "@/components/import/import-backup-form";

export default async function ImportPage() {
  const [accounts, accountId] = await Promise.all([getAccounts(), getSelectedAccountId()]);
  const accountName = accounts.find((account) => account.id === accountId)?.name ?? null;

  return (
    // A reading-width column, like Ajustes: one field and one button.
    <div className="max-w-2xl space-y-4 md:space-y-5">
      <div className="mb-2 md:mb-3">
        <h1 className="text-2xl font-bold md:text-3xl">Importar copia</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Restaura una copia de seguridad hecha con «Exportar»: categorías, movimientos, movimientos fijos e
          inversiones.
        </p>
      </div>

      <section className="surface-card p-5 md:p-6">
        <ImportBackupForm accountName={accountName} />
      </section>
    </div>
  );
}
