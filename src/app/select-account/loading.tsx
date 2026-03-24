import { Loader2 } from "lucide-react";

export default function SelectAccountLoading() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="hidden lg:flex hero-surface relative items-center justify-center overflow-hidden rounded-none border-0" />

      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight lg:text-xl">
              Cargando cuenta...
            </h1>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-lg border border-border/80 bg-card px-5 py-4 text-base text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Preparando acceso
          </div>
        </div>
      </div>
    </div>
  );
}
