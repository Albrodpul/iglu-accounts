import { NextResponse } from "next/server";
import { getServiceDb } from "@/lib/db/service";

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

  const db = getServiceDb();

  // Snapshot the PREVIOUS month — cron runs on day 1, so the previous month is complete
  const now = new Date();
  const snapshotDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = snapshotDate.getFullYear();
  const month = snapshotDate.getMonth() + 1;

  try {
    const accounts = await db.accounts.findWithInvestments();
    const results: Array<{ account_id: string; ok: boolean; reason?: string }> = [];

    for (const account of accounts) {
      const funds = await db.investments.findFunds(account.id);

      if (funds.length === 0) {
        results.push({ account_id: account.id, ok: false, reason: "no_funds" });
        continue;
      }

      const totalInvested = funds.reduce((s, f) => s + Number(f.invested_amount), 0);
      const currentValue = funds.reduce((s, f) => s + Number(f.current_value), 0);
      const returnAmount = currentValue - totalInvested;
      const returnPct =
        totalInvested > 0
          ? Math.round((returnAmount / totalInvested) * 10000) / 100
          : 0;

      const { error } = await db.investments.upsertMonthlyReturn({
        account_id: account.id,
        year,
        month,
        total_invested: Math.round(totalInvested * 100) / 100,
        current_value: Math.round(currentValue * 100) / 100,
        return_amount: Math.round(returnAmount * 100) / 100,
        return_pct: returnPct,
      });

      results.push({ account_id: account.id, ok: !error, reason: error ?? undefined });
    }

    const saved = results.filter((r) => r.ok).length;
    return NextResponse.json({ year, month, saved, accounts: results });
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
