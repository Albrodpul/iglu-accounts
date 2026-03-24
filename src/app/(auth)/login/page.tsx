"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  browserSupportsWebAuthnAutofill,
  startAuthentication,
} from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import { signIn } from "@/actions/auth";
import { AuthButtonContent } from "@/components/auth/auth-button-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPasskey, setLoadingPasskey] = useState(false);
  const attemptedAutofillRef = useRef(false);
  const isAnyLoading = loading || loadingPasskey;

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
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Panel decorativo - solo desktop */}
      <div className="hidden lg:flex hero-surface relative items-center justify-center overflow-hidden rounded-none border-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(126,200,240,0.25),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="relative flex flex-col items-center gap-6 px-12 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg">
            <Image src="/iglu.svg" alt="Iglú" width={64} height={64} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Iglú Management</h1>
            <p className="mt-2 text-base text-white/70">
              Gestión de gastos y finanzas personales
            </p>
          </div>
        </div>
      </div>

      {/* Panel formulario */}
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Header - visible en móvil, simplificado en desktop */}
          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/12 lg:hidden">
              <Image src="/iglu.svg" alt="Iglú" width={36} height={36} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight lg:text-xl">
                <span className="lg:hidden">Iglú Management</span>
                <span className="hidden lg:inline">Bienvenido</span>
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Inicia sesión para continuar
              </p>
            </div>
          </div>

          {/* Formulario */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit(new FormData(event.currentTarget));
            }}
            className="space-y-5"
            aria-busy={isAnyLoading}
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username webauthn"
                placeholder="tu@email.com"
                required
                disabled={isAnyLoading}
                className="h-12 rounded-lg text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isAnyLoading}
                className="h-12 rounded-lg text-base"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-expense/10 p-3 text-sm text-expense">
                {error}
              </p>
            )}
            {isAnyLoading && (
              <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
                Procesando acceso...
              </p>
            )}

            <div className="space-y-3 pt-1">
              <Button type="submit" size="lg" className="h-12 w-full rounded-lg text-base font-semibold" disabled={isAnyLoading}>
                <AuthButtonContent
                  loading={loading}
                  loadingText="Entrando..."
                  idleText="Entrar"
                />
              </Button>

              <div className="relative flex items-center py-1">
                <div className="grow border-t border-border" />
                <span className="mx-3 shrink-0 text-xs text-muted-foreground">o</span>
                <div className="grow border-t border-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 w-full rounded-lg text-base font-semibold"
                disabled={isAnyLoading}
                onClick={() => handlePasskeyLogin(false)}
              >
                <AuthButtonContent
                  loading={loadingPasskey}
                  loadingText="Verificando huella..."
                  idleText="Entrar con huella"
                  idleIcon={<Fingerprint className="size-5" />}
                />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
