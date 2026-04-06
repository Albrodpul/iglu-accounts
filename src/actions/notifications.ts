"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function savePushSubscription(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) return { error: error.message };
  return { success: true };
}

export async function sendTestNotification() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscriptions, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (fetchError) return { error: fetchError.message };
  if (!subscriptions || subscriptions.length === 0) {
    return { error: "No hay suscripciones activas para este usuario" };
  }

  const { sendPushToMany } = await import("@/lib/web-push");
  const result = await sendPushToMany(subscriptions, {
    title: "Iglu — Prueba",
    body: "Las notificaciones funcionan correctamente",
    url: "/settings",
  });

  // Clean expired
  if (result.expired.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", result.expired);
  }

  if (result.sent === 0) {
    return { error: "No se pudo enviar la notificación. Comprueba los permisos del navegador." };
  }

  return { success: true };
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { error: error.message };
  return { success: true };
}
