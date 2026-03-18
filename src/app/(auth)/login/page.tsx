"use client";

import { useState } from "react";
import Image from "next/image";
import { startAuthentication } from "@simplewebauthn/browser";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPasskey, setLoadingPasskey] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    if (!window.PublicKeyCredential) {
      setError("Este dispositivo no soporta Passkeys");
      return;
    }

    setLoadingPasskey(true);
    setError(null);

    try {
      const optionsRes = await fetch("/api/auth/passkeys/authenticate/options", {
        method: "POST",
      });
      const optionsPayload = (await optionsRes.json()) as {
        error?: string;
        options?: Parameters<typeof startAuthentication>[0]["optionsJSON"];
      };

      if (!optionsRes.ok || !optionsPayload.options) {
        throw new Error(optionsPayload.error ?? "No se pudo iniciar el acceso por passkey");
      }

      const authResp = await startAuthentication({
        optionsJSON: optionsPayload.options,
      });

      const verifyRes = await fetch("/api/auth/passkeys/authenticate/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(authResp),
      });
      const verifyPayload = (await verifyRes.json()) as {
        error?: string;
        actionLink?: string;
      };

      if (!verifyRes.ok || !verifyPayload.actionLink) {
        throw new Error(verifyPayload.error ?? "No se pudo completar el acceso con passkey");
      }

      window.location.href = verifyPayload.actionLink;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de autenticación con passkey";
      setError(message);
      setLoadingPasskey(false);
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
              <Image src="/iglu.svg" alt="Iglú" width={32} height={32} />
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
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl font-semibold"
              disabled={loadingPasskey}
              onClick={handlePasskeyLogin}
            >
              {loadingPasskey ? "Verificando huella..." : "Entrar con huella / passkey"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
