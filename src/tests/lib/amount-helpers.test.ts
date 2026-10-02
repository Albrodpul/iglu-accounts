import { describe, expect, it } from "vitest";
import { evaluateAmount, isSum, toAmountText } from "@/lib/amount-expression";
import { matchesSearch, parseAmountQuery } from "@/lib/amount-search";
import {
  getPendingThisMonth,
  joinRecurringNotes,
  recurringIdsFromNotes,
  splitRecurringNotes,
} from "@/lib/recurring";
import { formatDayHeader } from "@/lib/format";

describe("evaluateAmount", () => {
  it("reads a plain amount with comma or dot", () => {
    expect(evaluateAmount("99")).toBe(99);
    expect(evaluateAmount("12,5")).toBe(12.5);
    expect(evaluateAmount("12.5")).toBe(12.5);
    expect(evaluateAmount(" 7 € ")).toBe(7);
  });

  it("adds and subtracts", () => {
    expect(evaluateAmount("12,50+8")).toBe(20.5);
    expect(evaluateAmount("100-15,5+0,5")).toBe(85);
    expect(evaluateAmount("0,1+0,2")).toBe(0.3); // no float noise
  });

  it("rejects anything that isn't an amount", () => {
    expect(evaluateAmount("")).toBeNull();
    expect(evaluateAmount("12+")).toBeNull();
    expect(evaluateAmount("abc")).toBeNull();
    expect(evaluateAmount("1,2,3")).toBeNull();
  });

  it("tells sums from plain (even negative) amounts", () => {
    expect(isSum("12+8")).toBe(true);
    expect(isSum("-12")).toBe(false);
    expect(isSum("12")).toBe(false);
  });

  it("writes numbers back the Spanish way", () => {
    expect(toAmountText(99)).toBe("99");
    expect(toAmountText(20.5)).toBe("20,50");
    expect(toAmountText(-80.19)).toBe("-80,19");
    expect(toAmountText(0)).toBe("0");
    expect(toAmountText(0.0000001)).toBe("0,0000001");
  });
});

describe("amount search", () => {
  it("turns a number into a range as precise as what was typed", () => {
    expect(parseAmountQuery("80")).toEqual({ min: 80, max: 81 });
    expect(parseAmountQuery("80,1")).toEqual({ min: 80.1, max: 80.2 });
    expect(parseAmountQuery("-80.19 €")).toEqual({ min: 80.19, max: 80.2 });
    expect(parseAmountQuery("Corolla 2")).toBeNull();
  });

  it("matches by concept or by amount, ignoring the sign", () => {
    const seguro = { concept: "Seguro Corolla", amount: -80.19 };
    expect(matchesSearch(seguro, "corolla")).toBe(true);
    expect(matchesSearch(seguro, "80")).toBe(true);
    expect(matchesSearch(seguro, "80,19")).toBe(true);
    expect(matchesSearch(seguro, "80,2")).toBe(false);
    expect(matchesSearch(seguro, "8")).toBe(false);
    expect(matchesSearch({ concept: "Bus 80", amount: -1.5 }, "80")).toBe(true); // concept still counts
    expect(matchesSearch(seguro, "")).toBe(true);
  });
});

describe("getPendingThisMonth", () => {
  const item = (id: string, day: number, over = {}) => ({
    id,
    schedule_type: "monthly",
    day_of_month: day,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  });

  it("keeps what is scheduled from today on and not yet charged, sorted by day", () => {
    const items = [item("late", 28), item("past", 3), item("done", 20), item("today", 10)];
    const pending = getPendingThisMonth(items, new Set(["done"]), 2026, 10, 10);
    expect(pending.map((p) => [p.id, p.day])).toEqual([["today", 10], ["late", 28]]);
  });

  it("skips bimonthly items on their off month", () => {
    const bimonthly = [item("bi", 15, { schedule_type: "bimonthly" })]; // created in January (odd)
    expect(getPendingThisMonth(bimonthly, new Set(), 2026, 10, 1)).toEqual([]);
    expect(getPendingThisMonth(bimonthly, new Set(), 2026, 11, 1)).toHaveLength(1);
  });
});

describe("fixed-movement tag in notes", () => {
  it("separates the internal tag from what the user wrote", () => {
    expect(splitRecurringNotes("auto:recurring:r1")).toEqual({ marker: "auto:recurring:r1", text: "" });
    expect(splitRecurringNotes("auto:recurring:r1\nSubió de precio")).toEqual({
      marker: "auto:recurring:r1",
      text: "Subió de precio",
    });
    expect(splitRecurringNotes("Pagado a medias")).toEqual({ marker: null, text: "Pagado a medias" });
    expect(splitRecurringNotes(null)).toEqual({ marker: null, text: "" });
  });

  it("puts them back together without losing the tag", () => {
    expect(joinRecurringNotes("auto:recurring:r1", "")).toBe("auto:recurring:r1");
    expect(joinRecurringNotes("auto:recurring:r1", " nota ")).toBe("auto:recurring:r1\nnota");
    expect(joinRecurringNotes(null, " nota ")).toBe("nota");
  });

  it("still recognises a charged fixed movement after the user adds a note", () => {
    const ids = recurringIdsFromNotes([
      { notes: "auto:recurring:r1\nnota" },
      { notes: "auto:recurring:r2" },
      { notes: "normal" },
      { notes: null },
    ]);
    expect([...ids]).toEqual(["r1", "r2"]);
  });
});

describe("formatDayHeader", () => {
  it("includes the weekday, and the year on request", () => {
    expect(formatDayHeader("2026-09-28")).toBe("lun, 28 sept");
    expect(formatDayHeader("2026-09-28", true)).toBe("lun, 28 sept 2026");
  });
});
