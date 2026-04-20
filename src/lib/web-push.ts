// @ts-expect-error -- web-push has no type declarations
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:noreply@example.com";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID keys not configured");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const currencyFmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function formatRecurringPushBody(items: { concept: string; amount: number }[]): string {
  return items
    .map((i) => `${i.amount > 0 ? "Ingreso" : "Gasto"} · ${i.concept}: ${currencyFmt.format(i.amount)}`)
    .join("\n");
}

export function formatWeeklySummaryBody(params: {
  weekStart: string;
  weekEnd: string;
  totalExpenses: number;
  totalIncome: number;
  monthNet: number;
  monthName: string;
}): string {
  const lines = [`Semana del ${params.weekStart} al ${params.weekEnd}`];
  if (params.totalExpenses < 0) lines.push(`Gastos: ${currencyFmt.format(Math.abs(params.totalExpenses))}`);
  if (params.totalIncome > 0) lines.push(`Ingresos: ${currencyFmt.format(params.totalIncome)}`);
  lines.push(`Neto ${params.monthName}: ${currencyFmt.format(params.monthNet)}`);
  return lines.join("\n");
}

export async function sendPush(subscription: SubscriptionRow, payload: PushPayload) {
  ensureConfigured();

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return { success: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 404 or 410 = subscription expired/invalid
    if (statusCode === 404 || statusCode === 410) {
      return { success: false, expired: true };
    }
    return { success: false, expired: false };
  }
}

export async function sendPushToMany(
  subscriptions: SubscriptionRow[],
  payload: PushPayload,
): Promise<{ sent: number; expired: string[] }> {
  ensureConfigured();

  const expired: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const result = await sendPush(sub, payload);
      if (result.success) {
        sent++;
      } else if (result.expired) {
        expired.push(sub.endpoint);
      }
    }),
  );

  return { sent, expired };
}
