"use client";

import Link from "next/link";
import { Download, Loader2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useBackupExport } from "@/hooks/use-backup-export";
import { cn } from "@/lib/utils";
import { SettingsSection } from "./settings-section";

export function BackupSettings() {
  const { exporting, error, exportBackup } = useBackupExport();

  return (
    <SettingsSection
      title="Copia de seguridad"
      description="Descarga todos los datos de la cuenta en un archivo, o restaura uno que hayas guardado."
    >
      <div className="flex flex-col gap-2 md:flex-row">
        <Button variant="outline" className="h-11 w-full md:h-10 md:w-auto" onClick={exportBackup} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "Exportando..." : "Exportar"}
        </Button>
        <Link href="/import" className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full md:h-10 md:w-auto")}>
          <Upload className="h-4 w-4" />
          Importar
        </Link>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-expense">
          {error}
        </p>
      )}
    </SettingsSection>
  );
}
