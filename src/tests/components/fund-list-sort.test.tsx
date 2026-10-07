import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InvestmentFundWithType, InvestmentType } from "@/types";

vi.mock("@/actions/investments", () => ({
  createInvestmentFund: vi.fn(),
  updateInvestmentFund: vi.fn(),
  updateFundProfitability: vi.fn(),
  deleteInvestmentFund: vi.fn(),
  createContribution: vi.fn(),
  updateContribution: vi.fn(),
  getContributions: vi.fn(),
  deleteContribution: vi.fn(),
}));

import { FundList } from "@/components/investments/fund-list";

const type = (id: string, name: string) => ({ id, name }) as InvestmentType;
const equity = type("eq", "Renta Variable");
const cash = type("cash", "Cuenta remunerada");

const fund = (id: string, name: string, t: InvestmentType, invested: number, value: number) =>
  ({
    id,
    name,
    type_id: t.id,
    investment_type: t,
    invested_amount: invested,
    current_value: value,
    show_negative_returns: true,
    isin: null,
    ticker: null,
  }) as InvestmentFundWithType;

const funds = [
  fund("a", "Fidelity", equity, 1000, 1100),
  fund("b", "Vanguard", equity, 300, 290),
  fund("c", "Trade Republic", cash, 5000, 5050),
];

/** Fund names in the order they are rendered. */
const order = () => screen.getAllByText(/^(Fidelity|Vanguard|Trade Republic)$/).map((el) => el.textContent);

describe("FundList sorting", () => {
  it("is grouped by type until a column is sorted, and comes back to it", async () => {
    render(<FundList types={[equity, cash]} funds={funds} />);
    expect(order()).toEqual(["Fidelity", "Vanguard", "Trade Republic"]);
    expect(screen.getByRole("heading", { name: "Renta Variable" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Valor" }));
    expect(order()).toEqual(["Trade Republic", "Fidelity", "Vanguard"]); // biggest first, across types
    expect(screen.queryByRole("heading", { name: "Renta Variable" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Valor" }));
    expect(order()).toEqual(["Vanguard", "Fidelity", "Trade Republic"]);

    await userEvent.click(screen.getByRole("button", { name: "Valor" })); // third click: back to types
    expect(order()).toEqual(["Fidelity", "Vanguard", "Trade Republic"]);
  });

  it("sorts by return, and by name from A to Z first", async () => {
    render(<FundList types={[equity, cash]} funds={funds} />);

    await userEvent.click(screen.getByRole("button", { name: "Rentabilidad" }));
    expect(order()).toEqual(["Fidelity", "Trade Republic", "Vanguard"]); // +100, +50, -10

    await userEvent.click(screen.getByRole("button", { name: "Posición" }));
    expect(order()).toEqual(["Fidelity", "Trade Republic", "Vanguard"]);

    await userEvent.click(screen.getByRole("button", { name: "Volver a agrupar por tipo" }));
    expect(screen.getByRole("heading", { name: "Cuenta remunerada" })).toBeInTheDocument();
  });
});
