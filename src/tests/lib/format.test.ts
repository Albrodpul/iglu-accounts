import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/format";

// Intl uses a non-breaking space before "€".
const plain = (s: string) => s.replace(/\u00a0/g, " ");

describe("formatCurrency", () => {
  it("always groups thousands, even with four digits (es-ES skips it by default)", () => {
    expect(plain(formatCurrency(1234))).toBe("1.234,00 €");
    expect(plain(formatCurrency(-1234567.8))).toBe("-1.234.567,80 €");
  });

  it("always shows two decimals", () => {
    expect(plain(formatCurrency(5))).toBe("5,00 €");
    expect(plain(formatCurrency(0.456))).toBe("0,46 €");
  });
});
