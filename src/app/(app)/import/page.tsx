import { getCategories } from "@/actions/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportForm } from "@/components/import/import-form";

export default async function ImportPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Importar datos</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importar desde CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Sube un fichero CSV con tus gastos. El formato esperado es:
            </p>
            <div className="bg-muted p-3 rounded-lg font-mono text-xs">
              fecha,importe,concepto,categoría<br />
              2025-01-01,-574.95,Hipoteca,Hipoteca<br />
              2025-01-01,-60.97,Factura luz,Luz<br />
              2025-01-15,1150.00,Nómina,Ingresos<br />
            </div>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>fecha</strong>: formato AAAA-MM-DD</li>
              <li><strong>importe</strong>: negativo = gasto, positivo = ingreso</li>
              <li><strong>concepto</strong>: descripción del movimiento</li>
              <li><strong>categoría</strong>: debe coincidir con una categoría existente (ver Ajustes)</li>
            </ul>
            <p className="mt-2">
              <strong>Desde tu Excel/ODS:</strong> Abre el fichero en LibreOffice o Google Sheets,
              reorganiza los datos en las 4 columnas indicadas arriba, y exporta como CSV
              (Archivo → Guardar como → CSV).
            </p>
          </div>
          <ImportForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
