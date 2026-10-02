"use client";

import { useClientCheck } from "@/hooks/use-browser-state";
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
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SettingsRow, SettingsSection } from "./settings-section";

type Props = {
  hasInvestments: boolean;
  hasNotifications: boolean;
};

export function ModulesSettings({ hasInvestments, hasNotifications }: Props) {
  const [investEnabled, setInvestEnabled] = useState(hasInvestments);
  const [investLoading, setInvestLoading] = useState(false);

  const [notifEnabled, setNotifEnabled] = useState(hasNotifications);
  const [notifLoading, setNotifLoading] = useState(false);
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const pushSupported = useClientCheck(isPushSupported);

  useEffect(() => {
    if (!pushSupported) return;
    getExistingSubscription().then((sub) => setDeviceSubscribed(!!sub));
  }, [pushSupported]);

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
    <SettingsSection title="Módulos" description="Funciones opcionales de esta cuenta.">
      <div className="divide-y divide-border/60">
        <SettingsRow
          icon={<TrendingUp className="h-[18px] w-[18px] text-debt" />}
          title={<span id="module-investments">Inversiones</span>}
          description="Fondos, rentabilidades y desglose de activos."
          control={
            <ToggleSwitch
              enabled={investEnabled}
              loading={investLoading}
              onToggle={handleInvestToggle}
              aria-labelledby="module-investments"
            />
          }
        />

        <SettingsRow
          icon={<Bell className="h-[18px] w-[18px] text-transfer" />}
          title={<span id="module-notifications">Notificaciones</span>}
          description="Aviso cuando se cargan los movimientos fijos."
          control={
            <ToggleSwitch
              enabled={notifEnabled}
              loading={notifLoading}
              onToggle={handleNotifToggle}
              aria-labelledby="module-notifications"
            />
          }
        >
          {notifEnabled &&
            (pushSupported ? (
              deviceSubscribed ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-income">Este dispositivo las recibe</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await sendTestNotification();
                      if (result?.error) toast.error(result.error);
                      else toast.success("Notificación de prueba enviada");
                    }}
                    disabled={notifLoading}
                    className="cursor-pointer font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    Enviar prueba
                  </button>
                  <button
                    type="button"
                    onClick={handleUnsubscribeDevice}
                    disabled={notifLoading}
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    Dejar de recibirlas aquí
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSubscribeDevice}
                  disabled={notifLoading}
                  className="cursor-pointer text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Activar en este dispositivo
                </button>
              )
            ) : (
              // The switch is the account's setting; this browser just can't be one of the receivers.
              <p className="text-xs text-muted-foreground">
                Activadas para la cuenta. Este navegador no puede recibirlas; llegarán a los dispositivos donde
                las actives.
              </p>
            ))}
        </SettingsRow>
      </div>
    </SettingsSection>
  );
}
