"use client";

import { useState, useTransition } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteUserPasskey, type UserPasskey } from "@/actions/passkeys";
import { describeDevice } from "@/lib/device-label";
import { useClientCheck } from "@/hooks/use-browser-state";
import { formatDate } from "@/lib/format";
import { SettingsSection } from "./settings-section";

type Props = {
  passkeys: UserPasskey[];
};

const hasPasskeySupport = () => !!window.PublicKeyCredential;

export function PasskeysSettings({ passkeys }: Props) {
  const router = useRouter();
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { confirm, ConfirmDialog } = useConfirm();

  // Assumed during SSR (nearly every browser has it), so the "not supported"
  // notice doesn't flash and the server and client markup agree.
  const supported = useClientCheck(hasPasskeySupport, true);

  async function registerPasskey() {
    if (!supported) {
      toast.error("Este dispositivo no soporta Passkeys");
      return;
    }

    setLoadingRegister(true);

    try {
      const optionsRes = await fetch("/api/auth/passkeys/register/options", {
        method: "POST",
      });
      const optionsPayload = (await optionsRes.json()) as {
        error?: string;
        options?: Parameters<typeof startRegistration>[0]["optionsJSON"];
      };

      if (!optionsRes.ok || !optionsPayload.options) {
        throw new Error(optionsPayload.error ?? "No se pudo iniciar el registro");
      }

      const attResp = await startRegistration({
        optionsJSON: optionsPayload.options,
      });

      const verifyRes = await fetch("/api/auth/passkeys/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(attResp),
      });

      const verifyPayload = (await verifyRes.json()) as { error?: string };

      if (!verifyRes.ok) {
        throw new Error(verifyPayload.error ?? "No se pudo verificar la passkey");
      }

      toast.success("Passkey registrada correctamente");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar passkey";
      toast.error(message);
    } finally {
      setLoadingRegister(false);
    }
  }

  async function removePasskey(id: string) {
    const confirmed = await confirm({
      title: "Eliminar passkey",
      description:
        "¿Seguro que quieres eliminar esta passkey? No podrás usarla para iniciar sesión.",
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteUserPasskey(id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Passkey eliminada");
      router.refresh();
    });
  }

  return (
    <SettingsSection
      title="Seguridad"
      description="Entra con huella o cara, sin contraseña, desde los dispositivos que registres."
      action={
        <Button type="button" size="sm" onClick={registerPasskey} disabled={loadingRegister || !supported}>
          <Fingerprint className="size-4" />
          {loadingRegister ? "Registrando..." : "Añadir"}
        </Button>
      }
    >

      {!supported && (
        <p className="mb-3 rounded-lg bg-debt/10 p-3 text-sm text-debt">
          Este navegador no permite registrar el acceso con huella.
        </p>
      )}

      {passkeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no has registrado ningún dispositivo.</p>
      ) : (
        <div className="space-y-2">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Fingerprint className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  {/* The stored label is the raw user agent; `title` keeps it one hover away. */}
                  <p className="truncate text-sm font-medium" title={passkey.label ?? undefined}>
                    {describeDevice(passkey.label)}
                  </p>
                  <p className="text-xs text-muted-foreground">Registrado el {formatDate(passkey.created_at)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePasskey(passkey.id)}
                disabled={isPending}
                aria-label={`Eliminar ${describeDevice(passkey.label)}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {ConfirmDialog}
    </SettingsSection>
  );
}
