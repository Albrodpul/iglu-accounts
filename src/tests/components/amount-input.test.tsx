import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AmountInput, padDecimals } from "@/components/ui/amount-input";

const field = () => screen.getByLabelText("Importe") as HTMLInputElement;

describe("AmountInput", () => {
  it("shows an existing amount with two decimals", () => {
    render(<AmountInput aria-label="Importe" defaultValue={99} />);
    expect(field().value).toBe("99.00");
  });

  // jsdom normalises "12.50" back to "12.5" on number inputs (Chrome keeps it),
  // so the blur padding is covered through the helper it uses.
  it("pads to two decimals without rounding longer amounts", () => {
    expect(padDecimals("99")).toBe("99.00");
    expect(padDecimals("12.5")).toBe("12.50");
    expect(padDecimals("1.2345")).toBe("1.2345");
    expect(padDecimals("")).toBe("");
  });

  it("leaves an empty field empty on blur", async () => {
    render(<AmountInput aria-label="Importe" />);
    await userEvent.click(field());
    await userEvent.tab();
    expect(field().value).toBe("");
  });
});
