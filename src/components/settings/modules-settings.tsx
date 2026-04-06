"use client";

import { useState, useEffect } from "react";
import { toggleInvestments, toggleNotifications } from "@/actions/accounts";
import { savePushSubscription, removePushSubscription, sendTestNotification } from "@/actions/notifications";
import {
  isPushSupported,
  subscribePush,
  getExistingSubscription,
  serializeSubscription,
} from "@/lib/push-client";
import { toast } from "sonner";
import { TrendingUp, Bell } from "lucide-react";

type Props = {
  hasInvestments: boolean;
  hasNotifications: boolean;
};

function ToggleSwitch({
  enabled,
  loading,
  onToggle,
}: {
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={loading}
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
        enabled ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function ModulesSettings({ hasInvestments, hasNotifications }: Props) {
  const [investEnabled, setInvestEnabled] = useState(hasInvestments);
  const [investLoading, setInvestLoading] = useState(false);

  const [notifEnabled, setNotifEnabled] = useState(hasNotifications);
  const [notifLoading, setNotifLoading] = useState(false);
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    const supported = isPushSupported();
    setPushSupported(supported);
    if (supported) {
      getExistingSubscription().then((sub) => setDeviceSubscribed(!!sub));
    }
  }, []);

  async function handleInvestToggle() {
    setInvestLoading(true);
    const newValue = !investEnabled;
    const result = await toggleInvestments(newValue);
    if (result?.error) {
      toast.error(result.error);
    } else {
      setInvestEnabled(newValue);
      toast.success(newValue ? "Módulo de inversiones activado" : "Módulo de inversiones desactivado");
    }
    setInvestLoading(false);
  }

  async function handleNotifToggle() {
    setNotifLoading(true);
    const newValue = !notifEnabled;
    const result = await toggleNotifications(newValue);
    if (result?.error) {
      toast.error(result.error);
      setNotifLoading(false);
      return;
    }

    setNotifEnabled(newValue);
    toast.success(newValue ? "Notificaciones activadas" : "Notificaciones desactivadas");

    // If enabling and device not subscribed, try to subscribe
    if (newValue && !deviceSubscribed && pushSupported) {
      await handleSubscribeDevice();
    }

    setNotifLoading(false);
  }

  async function handleSubscribeDevice() {
    setNotifLoading(true);
    const subscription = await subscribePush();
    if (!subscription) {
      toast.error("No se pudo activar las notificaciones en este dispositivo. Comprueba los permisos del navegador.");
      setNotifLoading(false);
      return;
    }

    const serialized = serializeSubscription(subscription);
    const result = await savePushSubscription(serialized);
    if (result?.error) {
      toast.error(result.error);
    } else {
      setDeviceSubscribed(true);
      toast.success("Dispositivo suscrito a notificaciones");
    }
    setNotifLoading(false);
  }

  async function handleUnsubscribeDevice() {
    setNotifLoading(true);
    const subscription = await getExistingSubscription();
    if (subscription) {
      await removePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setDeviceSubscribed(false);
    toast.success("Dispositivo desuscrito");
    setNotifLoading(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Activa o desactiva módulos opcionales para esta cuenta
      </p>

      {/* Inversiones */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-card p-5">
        <div className="flex min-w-0 items-center gap-3.5 md:gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 md:h-10 md:w-10">
            <TrendingUp className="h-[18px] w-[18px] text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">Inversiones</p>
            <p className="text-sm text-muted-foreground">
              Control de fondos, rentabilidades y desglose de activos
            </p>
          </div>
        </div>
        <ToggleSwitch enabled={investEnabled} loading={investLoading} onToggle={handleInvestToggle} />
      </div>

      {/* Notificaciones */}
      <div className="rounded-lg border border-border/80 bg-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5 md:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 md:h-10 md:w-10">
              <Bell className="h-[18px] w-[18px] text-violet-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">Notificaciones</p>
              <p className="text-sm text-muted-foreground">
                Aviso cuando se añaden movimientos fijos automáticamente
              </p>
            </div>
          </div>
          <ToggleSwitch enabled={notifEnabled} loading={notifLoading} onToggle={handleNotifToggle} />
        </div>

        {notifEnabled && pushSupported && (
          <div className="ml-[52px] md:ml-[56px]">
            {deviceSubscribed ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-emerald-600">Este dispositivo recibe notificaciones</p>
                  <button
                    type="button"
                    onClick={handleUnsubscribeDevice}
                    disabled={notifLoading}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Desuscribir
                  </button>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await sendTestNotification();
                    if (result?.error) toast.error(result.error);
                    else toast.success("Notificación de prueba enviada");
                  }}
                  disabled={notifLoading}
                  className="text-xs font-medium text-violet-500 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Enviar prueba
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubscribeDevice}
                disabled={notifLoading}
                className="text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
              >
                Activar en este dispositivo
              </button>
            )}
          </div>
        )}

        {notifEnabled && !pushSupported && (
          <p className="ml-[52px] md:ml-[56px] text-xs text-muted-foreground">
            Este navegador no soporta notificaciones push
          </p>
        )}
      </div>
    </div>
  );
}
