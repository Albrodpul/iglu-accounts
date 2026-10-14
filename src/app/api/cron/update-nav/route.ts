import { NextResponse } from "next/server";
import { getServiceDb } from "@/lib/db/service";
import { fetchNavByIsin, fetchPriceByTicker, calculateCurrentValue, priceFields } from "@/lib/nav";

/** Called hourly by Supabase pg_cron (see supabase/cron/update-nav.sql); a few funds take seconds each. */
export const maxDuration = 120;

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
  const results: Array<{
    id: string;
    symbol: string;
    source: "isin" | "ticker";
    nav: number | null;
    updated: boolean;
    reason?: string;
  }> = [];

  try {
    const funds = await db.investments.findFundsForNav();

    for (const fund of funds) {
      const usesTicker = !!fund.ticker;
      const symbol = fund.ticker ?? fund.isin ?? "unknown";
      const source = usesTicker ? "ticker" : "isin";

      const quote = usesTicker
        ? await fetchPriceByTicker(fund.ticker!)
        : await fetchNavByIsin(fund.isin!);
      const nav = quote?.price ?? null;

      if (quote === null || nav === null) {
        results.push({ id: fund.id, symbol, source, nav: null, updated: false, reason: "price_not_found" });
        continue;
      }

      const newCurrentValue = calculateCurrentValue(fund.investment_contributions, nav);

      if (newCurrentValue === null) {
        results.push({ id: fund.id, symbol, source, nav, updated: false, reason: "no_priced_contributions" });
        continue;
      }

      // Same rule as the manual refresh: a fund that hides losses never shows below cost.
      const effectiveValue = newCurrentValue < fund.invested_amount && !fund.show_negative_returns
        ? fund.invested_amount
        : newCurrentValue;

      const value = Math.round(effectiveValue * 100) / 100;
      const { error } = await db.investments.updateFund(fund.id, fund.account_id, {
        current_value: value,
        updated_at: new Date().toISOString(),
        ...priceFields(quote, fund.price_date),
      });

      results.push({
        id: fund.id,
        symbol,
        source,
        nav,
        updated: !error,
        reason: error ?? undefined,
      });
    }

    const updated = results.filter((r) => r.updated).length;
    const skipped = results.filter((r) => !r.updated).length;

    return NextResponse.json({ updated, skipped, funds: results });
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
