import { describe, expect, it } from "vitest";
import { monthIndexOf, toLocalISODate } from "@/lib/dates";

describe("toLocalISODate", () => {
  it("formats the local calendar date with zero padding", () => {
    expect(toLocalISODate(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
  });

  it("keeps the local day right after midnight (toISOString would give yesterday in UTC+)", () => {
    // 00:30 local time on 29 Sep: in Spain (UTC+2) this is 28 Sep 22:30 UTC.
    const justAfterMidnight = new Date(2026, 8, 29, 0, 30);
    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe("2026-09-28"); // the old bug
    expect(toLocalISODate(justAfterMidnight)).toBe("2026-09-29");
  });

  it("keeps the local day right before midnight", () => {
    expect(toLocalISODate(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
});

describe("monthIndexOf", () => {
  it("reads the zero-based month straight from the ISO string", () => {
    expect(monthIndexOf("2026-01-01")).toBe(0);
    expect(monthIndexOf("2026-09-30")).toBe(8);
    expect(monthIndexOf("2026-12-31")).toBe(11);
  });
});
