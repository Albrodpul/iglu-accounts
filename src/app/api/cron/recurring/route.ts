import { NextResponse } from "next/server";
import { getServiceDb } from "@/lib/db/service";
import { getScheduledDay } from "@/lib/recurring";
import { sendPushToMany, formatRecurringPushBody, formatWeeklySummaryBody } from "@/lib/web-push";

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const db = getServiceDb();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();
    const dayOfWeek = now.getDay();
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    // ─── 1. Process recurring expenses ───
    let inserted = 0;
    let notified = 0;

    const recurring = await db.recurring.findAllActive();

    if (!recurring) {
      return NextResponse.json({ error: "Fetch recurring failed" }, { status: 500 });
    }

    if (recurring.length > 0) {
      const startDate = `${monthStr}-01`;
      const endDate =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const existingNotes = await db.expenses.findRecurringNotesInRange(null, startDate, endDate);

      const alreadyInserted = new Set(
        existingNotes.map((e) => e.notes?.replace("auto:recurring:", "")).filter(Boolean),
      );

      const toInsert = recurring
        .filter((r) => {
          if (alreadyInserted.has(r.id)) return false;
          const day = getScheduledDay(r, year, month);
          return day === today;
        })
        .map((r) => ({
          user_id: r.user_id,
          account_id: r.account_id,
          category_id: r.category_id,
          amount: r.amount,
          concept: r.concept || (r.amount > 0 ? "Ingreso fijo" : "Gasto fijo"),
          expense_date: `${monthStr}-${String(today).padStart(2, "0")}`,
          notes: `auto:recurring:${r.id}`,
        }));

      if (toInsert.length > 0) {
        const { error: insertError } = await db.expenses.createMany(toInsert);
        if (insertError) {
          return NextResponse.json({ error: `Insert: ${insertError}` }, { status: 500 });
        }
        inserted = toInsert.length;

        // Send recurring push notifications
        try {
          const byAccount = new Map<string, typeof toInsert>();
          for (const item of toInsert) {
            if (item.account_id) {
              const list = byAccount.get(item.account_id) || [];
              list.push(item);
              byAccount.set(item.account_id, list);
            }
          }

          for (const [accountId, items] of byAccount) {
            const account = await db.accounts.findForNotifications(accountId);
            if (!account?.notifications_enabled) continue;

            const userIds = await db.accounts.getMemberUserIds(accountId);
            if (userIds.length === 0) continue;

            const subscriptions = await db.notifications.findByUsers(userIds);
            if (subscriptions.length === 0) continue;

            const body = formatRecurringPushBody(items);
            const result = await sendPushToMany(subscriptions, {
              title: account.name || "Iglu",
              body,
              url: "/expenses",
            });
            notified += result.sent;

            if (result.expired.length > 0) {
              await db.notifications.deleteByEndpoints(result.expired);
            }
          }
        } catch {
          // Push errors should not fail the cron
        }
      }
    }

    // ─── 2. Weekly summary (Mondays only) ───
    let weeklySent = 0;

    if (dayOfWeek === 1) {
      try {
        const weekEnd = new Date(now);
        weekEnd.setDate(today - 1);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);

        const weekStartStr = weekStart.toISOString().split("T")[0];
        const weekEndDate = new Date(weekEnd);
        weekEndDate.setDate(weekEndDate.getDate() + 1);
        const weekEndStr = weekEndDate.toISOString().split("T")[0];

        const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
        const weekStartLabel = dateFmt.format(weekStart);
        const weekEndLabel = dateFmt.format(weekEnd);

        const accounts = await db.accounts.findWithNotificationsEnabled();

        for (const account of accounts) {
          const weekExpenses = await db.expenses.findAmountsByDateRange(
            account.id,
            weekStartStr,
            weekEndStr,
          );

          if (!weekExpenses || weekExpenses.length === 0) continue;

          const specialCats = await db.categories.findByNamesIn(account.id, [
            "Deuda", "deuda", "Traspaso", "traspaso",
          ]);
          const excludeIds = new Set(specialCats.map((c) => c.id));

          const filtered = weekExpenses.filter((e) => !excludeIds.has(e.category_id));
          const totalExpenses = filtered
            .filter((e) => e.amount < 0)
            .reduce((s, e) => s + e.amount, 0);
          const totalIncome = filtered
            .filter((e) => e.amount > 0)
            .reduce((s, e) => s + e.amount, 0);

          if (totalExpenses === 0 && totalIncome === 0) continue;

          const monthStart = `${monthStr}-01`;
          const monthEnd =
            month === 12
              ? `${year + 1}-01-01`
              : `${year}-${String(month + 1).padStart(2, "0")}-01`;

          const monthExpenses = await db.expenses.findAmountsByDateRange(
            account.id,
            monthStart,
            monthEnd,
          );

          const monthNet = (monthExpenses || [])
            .filter((e) => !excludeIds.has(e.category_id))
            .reduce((s, e) => s + e.amount, 0);

          const body = formatWeeklySummaryBody({
            weekStart: weekStartLabel,
            weekEnd: weekEndLabel,
            totalExpenses,
            totalIncome,
            monthNet,
            monthName: MONTHS_ES[month - 1],
          });

          const userIds = await db.accounts.getMemberUserIds(account.id);
          if (userIds.length === 0) continue;

          const subscriptions = await db.notifications.findByUsers(userIds);
          if (subscriptions.length === 0) continue;

          const result = await sendPushToMany(subscriptions, {
            title: account.name || "Iglu",
            body,
            url: "/dashboard",
          });
          weeklySent += result.sent;

          if (result.expired.length > 0) {
            await db.notifications.deleteByEndpoints(result.expired);
          }
        }
      } catch {
        // Weekly summary errors should not fail the cron
      }
    }

    return NextResponse.json({
      message: `Processed for ${monthStr}-${String(today).padStart(2, "0")}`,
      inserted,
      notified,
      weeklySent,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
