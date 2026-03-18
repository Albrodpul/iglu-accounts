"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  browserSupportsWebAuthnAutofill,
  startAuthentication,
} from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPasskey, setLoadingPasskey] = useState(false);
  const attemptedAutofillRef = useRef(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handlePasskeyLogin(useAutofill = false) {
    if (!window.PublicKeyCredential) {
      if (!useAutofill) {
        setError("Este dispositivo no soporta Passkeys");
      }
      return;
    }

    if (!useAutofill) {
      setLoadingPasskey(true);
      setError(null);
    }

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
        useBrowserAutofill: useAutofill,
        verifyBrowserAutofillInput: false,
      });

      const verifyRes = await fetch("/api/auth/passkeys/authenticate/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(authResp),
      });
      const verifyPayload = (await verifyRes.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!verifyRes.ok) {
        throw new Error(verifyPayload.error ?? "No se pudo completar el acceso con passkey");
      }

      window.location.href = verifyPayload.redirectTo ?? "/select-account";
    } catch (err) {
      if (!useAutofill) {
        const message = err instanceof Error ? err.message : "Error de autenticación con passkey";
        setError(message);
        setLoadingPasskey(false);
      }
      return;
    }

    if (!useAutofill) {
      setLoadingPasskey(false);
    }
  }

  useEffect(() => {
    async function tryAutofillPasskey() {
      if (attemptedAutofillRef.current) return;
      attemptedAutofillRef.current = true;

      if (!window.PublicKeyCredential) return;

      const supportsAutofill = await browserSupportsWebAuthnAutofill();
      if (!supportsAutofill) return;

      await handlePasskeyLogin(true);
    }

    void tryAutofillPasskey();
  }, []);

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
                autoComplete="username webauthn"
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
                autoComplete="current-password"
                required
                className="h-11 rounded-xl"
              />
            </div>
            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-expense">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full rounded-xl font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full rounded-xl font-semibold"
              disabled={loadingPasskey}
              onClick={() => handlePasskeyLogin(false)}
            >
              <Fingerprint className="size-4" />
              {loadingPasskey ? "Verificando huella..." : "Entrar con huella"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
