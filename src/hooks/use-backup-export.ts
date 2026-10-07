"use client";

import { useState } from "react";
import { exportAccountData } from "@/actions/export";
import { toLocalISODate } from "@/lib/dates";

/** Downloads the active account as a JSON backup; shared by every "Exportar" button. */
export function useBackupExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Resolves to whether the file was handed to the browser. */
  async function exportBackup(): Promise<boolean> {
    setExporting(true);
    setError(null);
    const result = await exportAccountData();
    setExporting(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iglu-backup-${toLocalISODate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  return { exporting, error, exportBackup, clearError: () => setError(null) };
}
