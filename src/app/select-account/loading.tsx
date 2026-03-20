import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SelectAccountLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(16,185,129,0.15),transparent_35%),radial-gradient(circle_at_80%_24%,rgba(14,165,233,0.12),transparent_38%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <Card className="w-full border-border/70 bg-card/90 shadow-[0_20px_45px_-24px_rgba(8,47,45,0.65)] backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <h1 className="text-xl font-semibold tracking-tight">Cargando cuenta...</h1>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 rounded-md border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Preparando acceso
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
