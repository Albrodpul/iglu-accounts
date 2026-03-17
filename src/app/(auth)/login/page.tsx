"use client";

import { useState } from "react";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(16,185,129,0.15),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(14,165,233,0.12),transparent_36%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
      <Card className="w-full border-border/70 bg-card/90 shadow-[0_20px_45px_-24px_rgba(8,47,45,0.65)] backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <span className="text-2xl">🛖</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Iglú Management</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Inicia sesión para continuar
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="h-11 rounded-xl"
              />
            </div>
            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-expense">
                {error}
              </p>
            )}
            <Button type="submit" className="h-11 w-full rounded-xl font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
