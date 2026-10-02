import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const comparePeriods = vi.hoisted(() => vi.fn());
vi.mock("@/actions/expenses", () => ({ comparePeriods }));

import { CategoryBreakdown } from "@/components/summary/category-breakdown";
import { YearComparison } from "@/components/summary/year-comparison";
import { Amount } from "@/components/ui/amount";

describe("CategoryBreakdown (ranking)", () => {
  const data = [
    { id: "home", name: "Hipoteca", color: "#f00", icon: "🏠", total: 7500 },
    { id: "fuel", name: "Gasolina", color: "#fa0", icon: "⛽", total: 2500 },
  ];

  it("shows the total, each share of it, and links to the movements of that category", () => {
    render(<CategoryBreakdown data={data} year={2026} />);

    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
    const fuel = screen.getByRole("link", { name: /Gasolina/ });
    expect(within(fuel).getByText(/25/)).toBeInTheDocument();
    expect(fuel).toHaveAttribute("href", "/expenses?year=2026&category=fuel");
  });
});

describe("YearComparison", () => {
  beforeEach(() => {
    comparePeriods.mockReset();
    comparePeriods.mockResolvedValue([
      { name: "Gasolina", icon: "⛽", color: "#fa0", valueA: -500, valueB: -420.4, diff: -79.6 },
    ]);
  });

  it("starts already comparing the year in view with the one before", async () => {
    render(<YearComparison year={2026} availableYears={[2026, 2025, 2024]} />);

    await waitFor(() => expect(comparePeriods).toHaveBeenCalledWith({ yearA: 2026, monthA: null, yearB: 2025, monthB: null }));
    expect(await screen.findByRole("columnheader", { name: "2025" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Gasolina/ })).toHaveTextContent("-80"); // whole euros
    expect(screen.queryByRole("button", { name: "Comparar" })).not.toBeInTheDocument();
  });

  it("compares again as soon as a period changes", async () => {
    render(<YearComparison year={2026} availableYears={[2026, 2025, 2024]} />);
    await screen.findByRole("columnheader", { name: "2025" });

    await userEvent.selectOptions(screen.getByLabelText("Periodo B: año"), "2024");
    await userEvent.selectOptions(screen.getByLabelText("Periodo B: mes"), "3");

    await waitFor(() => expect(comparePeriods).toHaveBeenLastCalledWith({ yearA: 2026, monthA: null, yearB: 2024, monthB: 3 }));
  });

  it("asks for a period when there is no earlier year to compare with", () => {
    render(<YearComparison year={2026} availableYears={[2026]} />);
    expect(screen.getByText(/Elige el año de los dos periodos/)).toBeInTheDocument();
    expect(comparePeriods).not.toHaveBeenCalled();
  });
});

describe("Amount whole", () => {
  it("rounds to whole euros and never shows a negative zero", () => {
    const { rerender } = render(<span data-testid="a"><Amount value={-105.83} compact whole /></span>);
    expect(screen.getByTestId("a")).toHaveTextContent("-106");
    rerender(<span data-testid="a"><Amount value={-0.3} whole /></span>);
    expect(screen.getByTestId("a").textContent).toMatch(/^0\s€$/);
  });
});
