"use client";

import { useLocalStorageValue, writeLocalStorage } from "@/hooks/use-browser-state";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  browserSupportsWebAuthnAutofill,
  startAuthentication,
} from "@simplewebauthn/browser";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
import { signIn } from "@/actions/auth";
import { AuthButtonContent } from "@/components/auth/auth-button-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NAME_KEY = "iglu:user:name";
/** Set once a fingerprint login succeeds here: from then on it is offered first. */
const PASSKEY_USED_KEY = "iglu:passkey:used";
const TAGLINE = "Gastos y finanzas del hogar";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 13) return "Buenos días";
  if (h >= 13 && h < 21) return "Buenas tardes";
  return "Buenas noches";
}

function LoginGreeting() {
  const storedName = useLocalStorageValue(NAME_KEY);
  const firstName = storedName ? storedName.split(" ")[0] : null;

  const greeting = getGreeting();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight lg:text-xl">
        {firstName ? `${greeting}, ${firstName}` : "Bienvenido"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Inicia sesión para continuar
      </p>
    </div>
  );
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPasskey, setLoadingPasskey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const attemptedAutofillRef = useRef(false);
  const isAnyLoading = loading || loadingPasskey;
  // On a device that has logged in by fingerprint before, that is the one-tap
  // way in: it goes first, and the password form becomes the alternative.
  const passkeyFirst = useLocalStorageValue(PASSKEY_USED_KEY) === "1";

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
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

      try {
        writeLocalStorage(PASSKEY_USED_KEY, "1");
      } catch {
        // Storage unavailable (private mode): the button just keeps its usual place.
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

  const passwordButton = (variant: "default" | "outline") => (
    <Button type="submit" variant={variant} size="lg" className="h-12 w-full rounded-lg text-base font-semibold" disabled={isAnyLoading}>
      <AuthButtonContent loading={loading} loadingText="Entrando..." idleText="Entrar" />
    </Button>
  );
  const passkeyButton = (variant: "default" | "outline") => (
    <Button
      type="button"
      variant={variant}
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
  );
  const divider = (label: string) => (
    <div className="relative flex items-center py-1">
      <div className="grow border-t border-border" />
      <span className="mx-3 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="grow border-t border-border" />
    </div>
  );

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Panel decorativo - solo desktop */}
      <div className="hidden lg:flex hero-panel relative items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(126,200,240,0.25),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="relative flex flex-col items-center gap-6 px-12 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg">
            <Image src="/iglu.svg" alt="Iglú" width={64} height={64} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Iglú Management</h1>
            <p className="mt-2 text-base text-white/70">{TAGLINE}</p>
          </div>
        </div>
      </div>

      {/* Panel formulario. On phones: brand gradient behind, form as a sheet. */}
      <div className="login-brand-bg flex flex-col lg:items-center lg:justify-center lg:px-12 lg:py-12">
        {/* Short phones get a compact header, so both ways in fit without scrolling. */}
        <div className="relative px-6 pb-14 pt-[calc(3rem+env(safe-area-inset-top))] text-center text-white lg:hidden [@media(max-height:740px)]:pb-9 [@media(max-height:740px)]:pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <div className="relative flex flex-col items-center gap-3 [@media(max-height:740px)]:flex-row [@media(max-height:740px)]:justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 shadow-lg ring-1 ring-white/25 backdrop-blur-sm [@media(max-height:740px)]:h-11 [@media(max-height:740px)]:w-11 [@media(max-height:740px)]:rounded-2xl">
              <Image src="/iglu.svg" alt="Iglú" width={52} height={52} priority className="[@media(max-height:740px)]:h-7 [@media(max-height:740px)]:w-7" />
            </div>
            <p className="text-2xl font-extrabold tracking-tight [@media(max-height:740px)]:text-xl">Iglú Management</p>
            <p className="text-sm text-white/70 [@media(max-height:740px)]:hidden">{TAGLINE}</p>
          </div>
        </div>

        <div className="flex-1 rounded-t-[2rem] bg-card px-6 pt-9 pb-[max(2.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-20px_rgba(14,40,68,0.5)] lg:w-full lg:max-w-sm lg:flex-none lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="mx-auto w-full max-w-sm space-y-7 [@media(max-height:740px)]:space-y-5">
          <div className="text-center lg:text-left">
            <LoginGreeting />
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
            {passkeyFirst && (
              <div className="space-y-3">
                {passkeyButton("default")}
                {divider("o con contraseña")}
              </div>
            )}
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
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isAnyLoading}
                  className="h-12 rounded-lg text-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-12 rounded-r-lg text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-expense/10 p-3 text-sm text-expense">
                {error}
              </p>
            )}
            {isAnyLoading && (
              <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
                Procesando acceso...
              </p>
            )}

            {!passkeyFirst && (
              <div className="space-y-3 pt-1">
                {passwordButton("default")}
                {divider("o")}
                {passkeyButton("outline")}
              </div>
            )}
            {passkeyFirst && <div className="pt-1">{passwordButton("outline")}</div>}
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
