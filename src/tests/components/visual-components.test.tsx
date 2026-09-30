import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/discrete-mode", () => ({ useDiscreteMode: () => ({ discrete: false }) }));

import { SegmentedControl } from "@/components/ui/segmented-control";
import { Amount } from "@/components/ui/amount";

describe("SegmentedControl", () => {
  function Harness() {
    const [value, setValue] = useState<"a" | "b">("a");
    return (
      <SegmentedControl
        aria-label="Tipo"
        value={value}
        onChange={setValue}
        options={[
          { value: "a", label: "Gasto", tone: "expense" },
          { value: "b", label: "Ingreso", tone: "income" },
        ]}
      />
    );
  }

  it("marks the selected option and switches on click", async () => {
    render(<Harness />);
    const gasto = screen.getByRole("button", { name: "Gasto" });
    const ingreso = screen.getByRole("button", { name: "Ingreso" });

    expect(gasto).toHaveAttribute("aria-pressed", "true");
    expect(gasto.className).toContain("text-expense");

    await userEvent.click(ingreso);

    expect(ingreso).toHaveAttribute("aria-pressed", "true");
    expect(ingreso.className).toContain("text-income");
    expect(gasto).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Amount animate (rolling number)", () => {
  const text = () => screen.getByTestId("amt").textContent?.replace(/\s/g, " ");

  it("shows the real value on first render — never counts up from 0", () => {
    render(<span data-testid="amt"><Amount value={1234.5} animate /></span>);
    expect(text()).toBe("1.234,50 €"); // grouped, two decimals
  });

  it("rolls from the old value to the new one and settles exactly", () => {
    // Simulated clock: deterministic regardless of CPU load in the full suite.
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    try {
      const { rerender } = render(<span data-testid="amt"><Amount value={100} animate /></span>);

      rerender(<span data-testid="amt"><Amount value={200} animate /></span>);
      expect(text()).toBe("100,00 €"); // starts from what was on screen

      act(() => vi.advanceTimersByTime(300));
      const mid = text();
      expect(mid).not.toBe("100,00 €");
      expect(mid).not.toBe("200,00 €"); // mid-roll value

      act(() => vi.advanceTimersByTime(1000));
      expect(text()).toBe("200,00 €");
    } finally {
      vi.useRealTimers();
    }
  });
});
