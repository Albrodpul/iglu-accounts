import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PriceDate } from "@/components/investments/price-date";
import { daysBetween, formatShortDate, navPublishedOn } from "@/lib/format";
import { priceFields } from "@/lib/nav";

describe("formatShortDate", () => {
  it("says today and yesterday in words", () => {
    expect(formatShortDate("2026-10-14", "2026-10-14")).toBe("hoy");
    expect(formatShortDate("2026-10-13", "2026-10-14")).toBe("ayer");
    expect(formatShortDate("2026-09-30", "2026-10-01")).toBe("ayer");
  });

  it("gives day and short month, with the year only when it differs", () => {
    expect(formatShortDate("2026-10-08", "2026-10-14")).toBe("8 oct");
    expect(formatShortDate("2025-12-30", "2026-01-02")).toBe("30 dic 2025");
  });
});

describe("daysBetween", () => {
  it("counts calendar days, across months and DST changes", () => {
    expect(daysBetween("2026-10-08", "2026-10-14")).toBe(6);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
});

describe("PriceDate", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 14, 12));
  });
  afterEach(() => vi.useRealTimers());

  it("shows a recent price plainly", () => {
    render(<PriceDate date="2026-10-13" />);
    const label = screen.getByText("Actualizado ayer");
    expect(label).not.toHaveAttribute("title");
  });

  it("flags a price several days old, saying how old", () => {
    render(<PriceDate date="2026-10-08" className="text-muted-foreground" />);
    const label = screen.getByText("Actualizado el 8 oct");
    expect(label).toHaveAttribute("title", "Sin precio nuevo desde hace 6 días");
    expect(label.className).toContain("text-amber-600");
    expect(label.className).not.toContain("text-muted-foreground");
  });

});

describe("PriceDate for fund NAVs", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 14, 15)); // Wednesday 14 Oct
  });
  afterEach(() => vi.useRealTimers());

  it("reads yesterday's NAV, published today, as updated today", () => {
    render(<PriceDate date="2026-10-13" publishedNextDay />);
    expect(screen.getByText("Actualizado hoy")).toBeInTheDocument();
  });

  it("dates a market price by its own day", () => {
    render(<PriceDate date="2026-10-13" />);
    expect(screen.getByText("Actualizado ayer")).toBeInTheDocument();
  });

  it("still flags a fund whose NAV stopped coming", () => {
    render(<PriceDate date="2026-10-08" publishedNextDay />);
    expect(screen.getByText("Actualizado el 9 oct")).toHaveAttribute("title", "Sin precio nuevo desde hace 5 días");
  });
});

describe("navPublishedOn", () => {
  it("is the next business day, never after today", () => {
    expect(navPublishedOn("2026-10-13", "2026-10-20")).toBe("2026-10-14"); // Tue → Wed
    expect(navPublishedOn("2026-10-09", "2026-10-20")).toBe("2026-10-12"); // Fri → Mon
    expect(navPublishedOn("2026-10-13", "2026-10-13")).toBe("2026-10-13"); // out the same evening
  });
});

describe("PriceDate with the update time", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 14, 15));
  });
  afterEach(() => vi.useRealTimers());

  it("says the day and hour the price came out", () => {
    render(<PriceDate date="2026-10-13" updatedAt={new Date(2026, 9, 14, 11, 0).toISOString()} publishedNextDay />);
    expect(screen.getByText("Actualizado hoy a las 11:00")).toBeInTheDocument();
  });

  it("flags by that moment, not by the valuation day", () => {
    render(<PriceDate date="2026-10-08" updatedAt={new Date(2026, 9, 9, 10, 0).toISOString()} publishedNextDay />);
    expect(screen.getByText("Actualizado el 9 oct a las 10:00")).toHaveAttribute("title", "Sin precio nuevo desde hace 5 días");
  });
});

describe("priceFields", () => {
  const now = new Date("2026-10-14T09:00:00Z");

  it("takes a market quote's own time", () => {
    expect(priceFields({ price: 1, date: "2026-10-14", time: "2026-10-14T12:44:31.000Z" }, "2026-10-13", now)).toEqual({
      price_date: "2026-10-14",
      price_updated_at: "2026-10-14T12:44:31.000Z",
    });
  });

  it("times a fund NAV when a new day first arrives, and only then", () => {
    expect(priceFields({ price: 1, date: "2026-10-13" }, "2026-10-12", now)).toEqual({
      price_date: "2026-10-13",
      price_updated_at: "2026-10-14T09:00:00.000Z",
    });
    expect(priceFields({ price: 1, date: "2026-10-13" }, "2026-10-13", now)).toEqual({ price_date: "2026-10-13" });
  });

  it("stores nothing without a date or time", () => {
    expect(priceFields({ price: 1, date: null }, "2026-10-13", now)).toEqual({});
  });
});
