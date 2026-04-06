import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getScheduledDay } from "@/lib/recurring";
import { sendPushToMany, formatRecurringPushBody } from "@/lib/web-push";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    // Get all active recurring items
    const { data: recurring, error: fetchError } = await supabase
      .from("recurring_expenses")
      .select("*")
      .eq("is_active", true);

    if (fetchError) {
      return NextResponse.json({ error: `Fetch recurring: ${fetchError.message}` }, { status: 500 });
    }

    if (!recurring || recurring.length === 0) {
      return NextResponse.json({ message: "No recurring items to process", inserted: 0 });
    }

    // Check which have already been inserted this month
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
      (existing || [])
        .map((e) => e.notes?.replace("auto:recurring:", ""))
        .filter(Boolean)
    );

    // Only insert items scheduled for today
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

    if (toInsert.length === 0) {
      return NextResponse.json({
        message: "No recurring items scheduled for today",
        inserted: 0,
        today: `${monthStr}-${String(today).padStart(2, "0")}`,
      });
    }

    const { error: insertError } = await supabase.from("expenses").insert(toInsert);

    if (insertError) {
      return NextResponse.json({ error: `Insert: ${insertError.message}` }, { status: 500 });
    }

    // Send push notifications to affected accounts
    let notified = 0;
    try {
      // Group inserted items by account
      const byAccount = new Map<string, typeof toInsert>();
      for (const item of toInsert) {
        if (item.account_id) {
          const list = byAccount.get(item.account_id) || [];
          list.push(item);
          byAccount.set(item.account_id, list);
        }
      }

      for (const [accountId, items] of byAccount) {
        // Check if notifications enabled for this account
        const { data: account } = await supabase
          .from("accounts")
          .select("notifications_enabled, name")
          .eq("id", accountId)
          .single();

        if (!account?.notifications_enabled) continue;

        // Get members of this account
        const { data: members } = await supabase
          .from("account_members")
          .select("user_id")
          .eq("account_id", accountId);

        if (!members || members.length === 0) continue;

        const userIds = members.map((m) => m.user_id);

        // Get push subscriptions for these users
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .in("user_id", userIds);

        if (!subscriptions || subscriptions.length === 0) continue;

        const body = formatRecurringPushBody(items);
        const result = await sendPushToMany(subscriptions, {
          title: account.name || "Iglu",
          body,
          url: "/expenses",
        });

        notified += result.sent;

        // Clean up expired subscriptions
        if (result.expired.length > 0) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .in("endpoint", result.expired);
        }
      }
    } catch (pushErr) {
      // Push errors should not fail the cron — but surface them for debugging
      return NextResponse.json({
        message: `Inserted ${toInsert.length} recurring items for ${monthStr}-${String(today).padStart(2, "0")}`,
        inserted: toInsert.length,
        notified,
        pushError: pushErr instanceof Error ? pushErr.message : String(pushErr),
      });
    }

    return NextResponse.json({
      message: `Inserted ${toInsert.length} recurring items for ${monthStr}-${String(today).padStart(2, "0")}`,
      inserted: toInsert.length,
      notified,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
