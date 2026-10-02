"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { chargeRecurringNow } from "@/actions/recurring";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toLocalISODate } from "@/lib/dates";
import { SAVE_FAILED_MESSAGE } from "@/lib/errors";
import { haptic } from "@/lib/haptics";

type Props = {
  recurringId: string;
  concept: string;
};

/** Creates today's movement for a pending fixed one, instead of waiting for its day. */
export function ChargeNowButton({ recurringId, concept }: Props) {
  const [loading, setLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const router = useRouter();

  async function handleClick() {
    const proceed = await confirm({
      title: `¿Cargar «${concept}» hoy?`,
      description: "Se creará el movimiento con fecha de hoy y este mes ya no se cargará automáticamente.",
      confirmLabel: "Cargar hoy",
    });
    if (!proceed) return;

    setLoading(true);
    try {
      const result = await chargeRecurringNow(recurringId, toLocalISODate());
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Movimiento fijo cargado");
      haptic();
      router.refresh();
    } catch {
      toast.error(SAVE_FAILED_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={`Cargar hoy ${concept}`}
        className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-60"
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        Cargar
      </button>
      {ConfirmDialog}
    </>
  );
}
