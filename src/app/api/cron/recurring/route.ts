import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // Get all active recurring expenses
  const { data: recurring, error: fetchError } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("is_active", true);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!recurring || recurring.length === 0) {
    return NextResponse.json({ message: "No recurring expenses to process", inserted: 0 });
  }

  // Check which recurring expenses have already been inserted this month
  // We use a convention: recurring expenses get a note "auto:recurring:{recurring_id}"
  const recurringIds = recurring.map((r) => r.id);
  const { data: existing } = await supabase
    .from("expenses")
    .select("notes")
    .like("notes", "auto:recurring:%")
    .gte("expense_date", `${monthStr}-01`)
    .lt("expense_date", month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`);

  const alreadyInserted = new Set(
    (existing || [])
      .map((e) => e.notes?.replace("auto:recurring:", ""))
      .filter(Boolean)
  );

  // Insert missing ones
  const toInsert = recurring
    .filter((r) => !alreadyInserted.has(r.id))
    .map((r) => {
      const day = r.day_of_month || 1;
      const lastDay = new Date(year, month, 0).getDate();
      const safeDay = Math.min(day, lastDay);

      return {
        user_id: r.user_id,
        account_id: r.account_id,
        category_id: r.category_id,
        amount: r.amount,
        concept: r.concept || "Gasto fijo",
        expense_date: `${monthStr}-${String(safeDay).padStart(2, "0")}`,
        notes: `auto:recurring:${r.id}`,
      };
    });

  if (toInsert.length === 0) {
    return NextResponse.json({ message: "All recurring expenses already inserted", inserted: 0 });
  }

  const { error: insertError } = await supabase.from("expenses").insert(toInsert);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Inserted ${toInsert.length} recurring expenses for ${monthStr}`,
    inserted: toInsert.length,
  });
}
