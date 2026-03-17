import { getCategories } from "@/actions/categories";
import { ImportOdsForm } from "@/components/import/import-ods-form";

export default async function ImportPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Importar desde hoja mensual</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sube tu archivo ODS y extraemos los movimientos diarios con fecha y comentario automáticamente.
        </p>
      </div>

      <section className="glass-panel p-5 md:p-6">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Necesitas al menos una categoría para importar movimientos. Crea una en Ajustes y vuelve aquí.
          </p>
        ) : (
          <ImportOdsForm />
        )}
      </section>
    </div>
  );
}
