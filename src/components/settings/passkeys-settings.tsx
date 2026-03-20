"use client";

import { useMemo, useState, useTransition } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteUserPasskey, type UserPasskey } from "@/actions/passkeys";

type Props = {
  passkeys: UserPasskey[];
};

export function PasskeysSettings({ passkeys }: Props) {
  const router = useRouter();
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { confirm, ConfirmDialog } = useConfirm();

  const supported = useMemo(
    () => typeof window !== "undefined" && !!window.PublicKeyCredential,
    []
  );

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
    <div className="glass-panel space-y-4 p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">Acceso con huella / biometría</p>
          <p className="text-sm text-muted-foreground">
            Activa Passkeys para entrar sin contraseña desde tu móvil o portátil.
          </p>
        </div>
        <Button
          type="button"
          onClick={registerPasskey}
          disabled={loadingRegister || !supported}
          className="shrink-0"
        >
          <Fingerprint className="size-4" />
          {loadingRegister ? "Registrando..." : "Añadir passkey"}
        </Button>
      </div>

      {!supported && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
          Este navegador no soporta Passkeys.
        </p>
      )}

      {passkeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no tienes passkeys registradas.</p>
      ) : (
        <div className="space-y-2">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between rounded-md border border-border/80 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{passkey.label ?? "Dispositivo"}</p>
                <p className="text-xs text-muted-foreground">
                  Creada: {new Date(passkey.created_at).toLocaleDateString("es-ES")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePasskey(passkey.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
