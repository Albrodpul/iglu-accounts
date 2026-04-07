import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
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
    const supabase = createServiceClient();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    // ─── 1. Process recurring expenses ───
    let inserted = 0;
    let notified = 0;

    const { data: recurring, error: fetchError } = await supabase
      .from("recurring_expenses")
      .select("*")
      .eq("is_active", true);

    if (fetchError) {
      return NextResponse.json({ error: `Fetch recurring: ${fetchError.message}` }, { status: 500 });
    }

    if (recurring && recurring.length > 0) {
      const { data: existing, error: existingError } = await supabase
        .from("expenses")
        .select("notes")
        .like("notes", "auto:recurring:%")
        .gte("expense_date", `${monthStr}-01`)
        .lt("expense_date", month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`);

      if (existingError) {
        return NextResponse.json({ error: `Fetch existing: ${existingError.message}` }, { status: 500 });
      }

      const alreadyInserted = new Set(
        (existing || []).map((e) => e.notes?.replace("auto:recurring:", "")).filter(Boolean),
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
        const { error: insertError } = await supabase.from("expenses").insert(toInsert);
        if (insertError) {
          return NextResponse.json({ error: `Insert: ${insertError.message}` }, { status: 500 });
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
            const { data: account } = await supabase
              .from("accounts")
              .select("notifications_enabled, name")
              .eq("id", accountId)
              .single();
            if (!account?.notifications_enabled) continue;

            const { data: members } = await supabase
              .from("account_members")
              .select("user_id")
              .eq("account_id", accountId);
            if (!members || members.length === 0) continue;

            const { data: subscriptions } = await supabase
              .from("push_subscriptions")
              .select("endpoint, p256dh, auth")
              .in("user_id", members.map((m) => m.user_id));
            if (!subscriptions || subscriptions.length === 0) continue;

            const body = formatRecurringPushBody(items);
            const result = await sendPushToMany(subscriptions, {
              title: account.name || "Iglu",
              body,
              url: "/expenses",
            });
            notified += result.sent;

            if (result.expired.length > 0) {
              await supabase.from("push_subscriptions").delete().in("endpoint", result.expired);
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
        // Week range: last Monday to last Sunday
        const weekEnd = new Date(now);
        weekEnd.setDate(today - 1); // yesterday (Sunday)
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6); // Monday of last week

        const weekStartStr = weekStart.toISOString().split("T")[0];
        const weekEndDate = new Date(weekEnd);
        weekEndDate.setDate(weekEndDate.getDate() + 1);
        const weekEndStr = weekEndDate.toISOString().split("T")[0];

        const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
        const weekStartLabel = dateFmt.format(weekStart);
        const weekEndLabel = dateFmt.format(weekEnd);

        // Get all accounts with notifications enabled
        const { data: accounts } = await supabase
          .from("accounts")
          .select("id, name, notifications_enabled")
          .eq("notifications_enabled", true);

        for (const account of accounts || []) {
          // Week expenses for this account
          const { data: weekExpenses } = await supabase
            .from("expenses")
            .select("amount, category_id")
            .eq("account_id", account.id)
            .gte("expense_date", weekStartStr)
            .lt("expense_date", weekEndStr);

          if (!weekExpenses || weekExpenses.length === 0) continue;

          // Get debt/transfer category IDs to exclude
          const { data: specialCats } = await supabase
            .from("categories")
            .select("id, name")
            .eq("account_id", account.id)
            .in("name", ["Deuda", "deuda", "Traspaso", "traspaso"]);

          const excludeIds = new Set((specialCats || []).map((c) => c.id));

          const filtered = weekExpenses.filter((e) => !excludeIds.has(e.category_id));
          const totalExpenses = filtered.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
          const totalIncome = filtered.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);

          if (totalExpenses === 0 && totalIncome === 0) continue;

          // Month net to date
          const { data: monthExpenses } = await supabase
            .from("expenses")
            .select("amount, category_id")
            .eq("account_id", account.id)
            .gte("expense_date", `${monthStr}-01`)
            .lt("expense_date", month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`);

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

          // Get subscriptions for account members
          const { data: members } = await supabase
            .from("account_members")
            .select("user_id")
            .eq("account_id", account.id);
          if (!members || members.length === 0) continue;

          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .in("user_id", members.map((m) => m.user_id));
          if (!subscriptions || subscriptions.length === 0) continue;

          const result = await sendPushToMany(subscriptions, {
            title: account.name || "Iglu",
            body,
            url: "/dashboard",
          });
          weeklySent += result.sent;

          if (result.expired.length > 0) {
            await supabase.from("push_subscriptions").delete().in("endpoint", result.expired);
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
