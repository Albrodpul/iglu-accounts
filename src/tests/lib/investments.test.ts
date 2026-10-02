import { describe, expect, it } from "vitest";
import { formatPercent, formatWhen } from "@/lib/format";
import { fundColors, groupPieSlices, lastPriceUpdate, OTHERS_COLOR, positionValue } from "@/lib/investments";
import { pieColor } from "@/lib/chart-colors";

// Intl puts a non-breaking space before "%".
const plain = (s: string) => s.replace(/\u00a0/g, " ");

describe("formatPercent", () => {
  it("uses a comma and a spaced sign, like the amounts", () => {
    expect(plain(formatPercent(6.83))).toBe("6,8 %");
    expect(plain(formatPercent(3.027, { decimals: 2 }))).toBe("3,03 %");
    expect(plain(formatPercent(30.4, { decimals: 0 }))).toBe("30 %");
  });

  it("signs gains and losses, but not zero", () => {
    expect(plain(formatPercent(6.83, { signed: true }))).toBe("+6,8 %");
    expect(plain(formatPercent(-2.5, { signed: true }))).toBe("-2,5 %");
    expect(plain(formatPercent(0, { signed: true }))).toBe("0,0 %");
  });
});

describe("fund colours", () => {
  const fund = (id: string, current: number, invested = current) => ({ id, invested_amount: invested, current_value: current });

  it("weighs a position by its value, or by what was put in while it has none", () => {
    expect(positionValue(fund("a", 120, 100))).toBe(120);
    expect(positionValue(fund("a", 0, 100))).toBe(100);
  });

  it("gives each position the colour of its slice, in order, skipping empty ones", () => {
    const colors = fundColors([fund("a", 50), fund("empty", 0, 0), fund("b", 900)]);
    expect(colors.get("a")).toBe(pieColor(0));
    expect(colors.get("b")).toBe(pieColor(1));
    expect(colors.has("empty")).toBe(false);
  });

  it("past seven positions, colours the biggest and greys the rest as 'Otros'", () => {
    const funds = Array.from({ length: 9 }, (_, i) => fund(`f${i}`, (i + 1) * 100)); // f8 is the biggest
    const colors = fundColors(funds);
    expect(colors.get("f8")).toBe(pieColor(0));
    expect(colors.get("f2")).toBe(pieColor(6));
    expect(colors.get("f1")).toBe(OTHERS_COLOR);
    expect(colors.get("f0")).toBe(OTHERS_COLOR);
    expect(groupPieSlices(funds.map((f) => ({ value: f.current_value }))).others).toHaveLength(2);
  });
});

describe("price update time", () => {
  it("takes the latest update among automatically priced positions only", () => {
    const fund = (updated_at: string, isin: string | null = null, ticker: string | null = null) => ({ isin, ticker, updated_at });
    expect(
      lastPriceUpdate([
        fund("2026-10-02T16:00:00Z", "IE00BYX5NX33"),
        fund("2026-10-02T17:00:05Z", null, "MU"),
        fund("2026-10-03T09:00:00Z"), // manual position edited later: not a price update
      ]),
    ).toBe("2026-10-02T17:00:05Z");
    expect(lastPriceUpdate([fund("2026-10-03T09:00:00Z")])).toBeNull();
  });

  it("says when in words", () => {
    const now = new Date(2026, 9, 2, 20, 30);
    expect(formatWhen(new Date(2026, 9, 2, 18, 2), now)).toBe("hoy a las 18:02");
    expect(formatWhen(new Date(2026, 9, 1, 23, 0), now)).toBe("ayer a las 23:00");
    expect(formatWhen(new Date(2026, 8, 28, 10, 0), now)).toBe("el 28 sept a las 10:00");
    expect(formatWhen(new Date(2025, 11, 31, 9, 5), now)).toBe("el 31 dic 2025 a las 09:05");
  });
});
