import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function getLastWeekdayOfMonth(year: number, month: number, weekday: number): number {
  // weekday: 0=Monday ... 6=Sunday (our convention)
  // JS Date: 0=Sunday, 1=Monday ... 6=Saturday
  const jsWeekday = weekday === 6 ? 0 : weekday + 1;
  const lastDay = new Date(year, month, 0).getDate();

  for (let d = lastDay; d >= 1; d--) {
    if (new Date(year, month - 1, d).getDay() === jsWeekday) {
      return d;
    }
  }
  return lastDay;
}

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
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();

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

    // Filter and compute dates
    const toInsert = recurring
      .filter((r) => {
        if (alreadyInserted.has(r.id)) return false;

        // Bimonthly: only insert on odd or even months (based on creation month)
        if (r.schedule_type === "bimonthly") {
          const createdMonth = new Date(r.created_at).getMonth() + 1;
          // Insert if same parity as creation month
          return (month % 2) === (createdMonth % 2);
        }

        return true;
      })
      .map((r) => {
        let day: number;
        const scheduleType = r.schedule_type || "monthly";

        switch (scheduleType) {
          case "last_day":
            day = lastDayOfMonth;
            break;
          case "last_weekday":
            day = getLastWeekdayOfMonth(year, month, r.day_of_month ?? 4); // default Friday
            break;
          case "bimonthly":
          case "monthly":
          default:
            day = r.day_of_month || 1;
            day = Math.min(day, lastDayOfMonth);
            break;
        }

        return {
          user_id: r.user_id,
          account_id: r.account_id,
          category_id: r.category_id,
          amount: r.amount,
          concept: r.concept || (r.amount > 0 ? "Ingreso fijo" : "Gasto fijo"),
          expense_date: `${monthStr}-${String(day).padStart(2, "0")}`,
          notes: `auto:recurring:${r.id}`,
        };
      });

    if (toInsert.length === 0) {
      return NextResponse.json({
        message: "All recurring items already inserted",
        inserted: 0,
        total_recurring: recurring.length,
        already_inserted: alreadyInserted.size,
      });
    }

    const { error: insertError } = await supabase.from("expenses").insert(toInsert);

    if (insertError) {
      return NextResponse.json({ error: `Insert: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      message: `Inserted ${toInsert.length} recurring items for ${monthStr}`,
      inserted: toInsert.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
