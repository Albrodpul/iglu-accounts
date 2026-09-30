import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/format";

// Intl uses a non-breaking space before "€".
const plain = (s: string) => s.replace(/\u00a0/g, " ");

describe("formatCurrency", () => {
  it("shows whole amounts without decimals", () => {
    expect(plain(formatCurrency(-99))).toBe("-99 €");
    expect(plain(formatCurrency(5))).toBe("5 €");
    expect(plain(formatCurrency(99.0000001))).toBe("99 €"); // float noise
  });

  it("shows two decimals when there are cents", () => {
    expect(plain(formatCurrency(12.5))).toBe("12,50 €");
    expect(plain(formatCurrency(0.456))).toBe("0,46 €");
  });

  it("always groups thousands, even with four digits (es-ES skips it by default)", () => {
    expect(plain(formatCurrency(1234))).toBe("1.234 €");
    expect(plain(formatCurrency(-1234567.8))).toBe("-1.234.567,80 €");
  });
});
