import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PriceDate } from "@/components/investments/price-date";
import { daysBetween, formatShortDate } from "@/lib/format";
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

describe("priceFields", () => {
  const now = new Date("2026-10-14T23:30:00Z"); // already the 15th in Spain

  it("dates a changed value with today's day in Spain", () => {
    expect(priceFields(100, 101.5, now)).toEqual({ price_date: "2026-10-15" });
  });

  it("leaves the date alone when nothing new arrived", () => {
    expect(priceFields(101.5, 101.5, now)).toEqual({});
  });
});
