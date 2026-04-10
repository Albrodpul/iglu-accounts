"use server";

import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";
import { redirect } from "next/navigation";

export async function savePushSubscription(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const { error } = await db.notifications.upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
  });

  if (error) return { error };
  return { success: true };
}

export async function sendTestNotification() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const subscriptions = await db.notifications.findByUser(user.id);

  if (!subscriptions) return { error: "Error al obtener suscripciones" };
  if (subscriptions.length === 0) {
    return { error: "No hay suscripciones activas para este usuario" };
  }

  const { sendPushToMany } = await import("@/lib/web-push");
  const result = await sendPushToMany(subscriptions, {
    title: "Iglu — Prueba",
    body: "Las notificaciones funcionan correctamente",
    url: "/settings",
  });

  if (result.expired.length > 0) {
    await db.notifications.deleteByEndpoints(result.expired);
  }

  if (result.sent === 0) {
    return { error: "No se pudo enviar la notificación. Comprueba los permisos del navegador." };
  }

  return { success: true };
}

export async function removePushSubscription(endpoint: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const { error } = await db.notifications.delete(user.id, endpoint);

  if (error) return { error };
  return { success: true };
}
