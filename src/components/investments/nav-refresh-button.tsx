"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshInvestmentNav } from "@/actions/investments";
import { toast } from "sonner";

export function NavRefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefreshNav() {
    setRefreshing(true);
    const result = await refreshInvestmentNav();
    if (result.error) {
      toast.error(result.error);
    } else if (result.updated === 0) {
      toast.info("Todos los NAV ya estaban actualizados");
    } else {
      toast.success(
        result.updated === 1
          ? "Rentabilidad actualizada (1 fondo)"
          : `Rentabilidad actualizada (${result.updated} fondos)`,
      );
      router.refresh();
    }
    setRefreshing(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRefreshNav} disabled={refreshing}>
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline ml-1">Actualizar NAV</span>
    </Button>
  );
}
