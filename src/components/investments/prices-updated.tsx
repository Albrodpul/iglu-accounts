"use client";

import { useClientCheck } from "@/hooks/use-browser-state";
import { formatWhen } from "@/lib/format";

const onClient = () => true;

/**
 * "Precios actualizados hoy a las 18:02". Formatted on the client only: the
 * server runs in UTC and would print the wrong hour (and the wrong "hoy").
 */
export function PricesUpdated({ at }: { at: string }) {
  const mounted = useClientCheck(onClient);
  return (
    <p className="min-h-4 text-xs text-muted-foreground">
      {mounted && (
        <>
          Precios actualizados <time dateTime={at}>{formatWhen(new Date(at))}</time>
        </>
      )}
    </p>
  );
}
