import { NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker") ?? "MU";

  const log: Record<string, unknown> = { ticker };

  // Step 1: fc.yahoo.com cookie
  try {
    const cookieRes = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    log.cookie_status = cookieRes.status;
    log.cookie_ok = cookieRes.ok;

    const rawSetCookie = cookieRes.headers.getSetCookie?.() ?? [];
    log.set_cookie_count = rawSetCookie.length;
    log.set_cookie_first = rawSetCookie[0]?.substring(0, 80) ?? null;

    const cookie = rawSetCookie.map((c) => c.split(";")[0]).join("; ");
    log.cookie_built = cookie.substring(0, 80);

    // Step 2: getcrumb
    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": USER_AGENT, "Cookie": cookie },
      signal: AbortSignal.timeout(10_000),
    });
    log.crumb_status = crumbRes.status;
    log.crumb_ok = crumbRes.ok;

    const crumbText = await crumbRes.text();
    log.crumb_raw = crumbText.substring(0, 100);
    log.crumb_is_html = crumbText.includes("<");

    if (!crumbRes.ok || !crumbText || crumbText.includes("<")) {
      log.session = "FAILED";

      // Fallback: v8/chart
      const fallbackUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const fb = await fetch(fallbackUrl, {
        headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      log.fallback_status = fb.status;
      if (fb.ok) {
        const fbData = await fb.json();
        const meta = fbData.chart?.result?.[0]?.meta;
        log.fallback_price = meta?.regularMarketPrice;
        log.fallback_currency = meta?.currency;
        log.fallback_market_time = meta?.regularMarketTime;
      }
    } else {
      log.session = "OK";
      log.crumb = crumbText;

      // Step 3: v7/quote
      const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}&crumb=${encodeURIComponent(crumbText)}&formatted=false&region=US`;
      const quoteRes = await fetch(quoteUrl, {
        headers: { "User-Agent": USER_AGENT, "Cookie": cookie, "Accept": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      log.quote_status = quoteRes.status;
      log.quote_ok = quoteRes.ok;

      if (quoteRes.ok) {
        const quoteData = await quoteRes.json();
        const q = quoteData?.quoteResponse?.result?.[0];
        log.quote_found = !!q;
        if (q) {
          log.marketState = q.marketState;
          log.currency = q.currency;
          log.regularMarketPrice = q.regularMarketPrice;
          log.preMarketPrice = q.preMarketPrice;
          log.postMarketPrice = q.postMarketPrice;
          log.regularMarketTime = q.regularMarketTime;
        } else {
          log.quote_raw = JSON.stringify(quoteData).substring(0, 300);
        }
      } else {
        const errText = await quoteRes.text();
        log.quote_error = errText.substring(0, 200);
      }
    }
  } catch (err) {
    log.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(log);
}
