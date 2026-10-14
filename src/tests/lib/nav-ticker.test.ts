import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNavByIsin, fetchPriceByTicker } from "@/lib/nav";

const json = (body: unknown, ok = true) => ({ ok, json: async () => body, text: async () => "", headers: new Headers() });
const unix = (iso: string) => Date.parse(iso) / 1000;

afterEach(() => vi.unstubAllGlobals());

describe("fetchPriceByTicker without a Yahoo session", () => {
  it("takes the latest extended-hours trade and its date, not yesterday's close", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("getcrumb")) return json(null, false); // session fails
      if (url.includes("/v8/finance/chart/MU")) {
        return json({
          chart: {
            result: [
              {
                meta: { regularMarketPrice: 953.19, regularMarketTime: unix("2026-10-13T20:00:00Z"), currency: "EUR" },
                timestamp: [unix("2026-10-14T12:40:00Z"), unix("2026-10-14T12:42:00Z"), unix("2026-10-14T12:44:00Z")],
                indicators: { quote: [{ close: [939.1, 938.05, null] }] },
              },
            ],
          },
        });
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPriceByTicker("MU")).resolves.toEqual({
      price: 938.05,
      date: "2026-10-14",
      time: "2026-10-14T12:42:00.000Z",
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("includePrePost=true"))).toBe(true);
  });
});

describe("fetchNavByIsin", () => {
  it("keeps the NAV date published by the fund", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ Data: [{ S: { OFDY901035: "14.716500|2026-10-13|EUR" } }] })));
    await expect(fetchNavByIsin("IE00BYX5NX33")).resolves.toEqual({ price: 14.7165, date: "2026-10-13" });
  });
});
