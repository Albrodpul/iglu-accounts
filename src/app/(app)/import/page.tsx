import { ImportBackupForm } from "@/components/import/import-backup-form";

export default async function ImportPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Importar copia de seguridad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Restaura todos los datos exportados desde esta aplicación: categorías, movimientos,
          recurrentes e inversiones.
        </p>
      </div>

      <section className="glass-panel p-5 md:p-6">
        <ImportBackupForm />
      </section>
    </div>
  );
}
