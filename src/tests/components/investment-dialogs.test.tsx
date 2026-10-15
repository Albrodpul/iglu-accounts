import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InvestmentContribution, InvestmentFundWithType, InvestmentType } from "@/types";

const mocks = vi.hoisted(() => ({
  checkPriceSource: vi.fn(),
  createInvestmentType: vi.fn(),
  updateInvestmentType: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/actions/investments", () => ({
  checkPriceSource: mocks.checkPriceSource,
  createInvestmentType: mocks.createInvestmentType,
  updateInvestmentType: mocks.updateInvestmentType,
  deleteInvestmentType: vi.fn(),
  setInvestmentTypesOrder: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));

import {
  ContributionForm,
  ContributionHistory,
  PriceSourceFields,
  ProfitabilityForm,
} from "@/components/investments/fund-forms";
import { InvestmentTypeManager } from "@/components/investments/investment-type-manager";

const fund = {
  id: "f1",
  name: "Fidelity MSCI World",
  invested_amount: 1000,
  current_value: 1071,
  show_negative_returns: true,
  isin: null,
  ticker: null,
} as InvestmentFundWithType;

const contribution = (over: Partial<InvestmentContribution>): InvestmentContribution => ({
  id: "c1",
  fund_id: "f1",
  account_id: "acc",
  amount: 1000,
  purchase_price: 10,
  units: null,
  contribution_date: "2026-08-13",
  notes: null,
  created_at: "2026-08-13T10:00:00Z",
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("PriceSourceFields", () => {
  it("checks an ISIN right away and shows the price found", async () => {
    mocks.checkPriceSource.mockResolvedValue({ found: true, source: "isin", price: 14.7165, date: "2026-10-13" });
    render(<PriceSourceFields defaultIsin="" defaultTicker="" />);

    const check = screen.getByRole("button", { name: "Comprobar" });
    expect(check).toBeDisabled(); // nothing to check yet
    await userEvent.type(screen.getByLabelText("ISIN (fondos)"), "IE00BYX5NX33");
    await userEvent.click(check);

    expect(mocks.checkPriceSource).toHaveBeenCalledWith({ isin: "IE00BYX5NX33", ticker: "" });
    expect(await screen.findByText(/14,7165 € · precio del 13 oct 2026 \(fundinfo\)/)).toBeInTheDocument();
  });

  it("says plainly when the source doesn't know it", async () => {
    mocks.checkPriceSource.mockResolvedValue({ found: false, source: "ticker", error: "Yahoo Finance no encuentra ese ticker" });
    render(<PriceSourceFields defaultIsin="" defaultTicker="XXXX" />);
    await userEvent.click(screen.getByRole("button", { name: "Comprobar" }));
    expect(await screen.findByText("Yahoo Finance no encuentra ese ticker")).toBeInTheDocument();
  });
});

describe("ProfitabilityForm", () => {
  it("warns that the hourly update will replace a manual figure", () => {
    const { rerender } = render(<ProfitabilityForm fund={fund} loading={false} onSubmit={vi.fn()} />);
    expect(screen.queryByText(/se actualiza solo cada hora/)).not.toBeInTheDocument();

    rerender(<ProfitabilityForm fund={{ ...fund, isin: "IE00BYX5NX33" }} loading={false} onSubmit={vi.fn()} />);
    expect(screen.getByText(/se actualiza solo cada hora con su ISIN/)).toBeInTheDocument();
  });
});

describe("ContributionForm", () => {
  it("has quick dates and folded notes", async () => {
    const onSubmit = vi.fn();
    render(<ContributionForm fund={fund} contribution={null} today="2026-10-15" loading={false} onSubmit={onSubmit} />);

    expect(screen.queryByLabelText("Notas (opcional)")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Añadir nota" }));
    await userEvent.type(screen.getByLabelText("Notas (opcional)"), "Mensual");
    await userEvent.click(screen.getByRole("button", { name: "Ayer" }));
    await userEvent.type(screen.getByLabelText("Importe"), "100");
    await userEvent.click(screen.getByRole("button", { name: "Registrar aportación" }));

    const data = onSubmit.mock.calls[0][0] as FormData;
    expect(data.get("notes")).toBe("Mensual");
    expect(data.get("contribution_date")).not.toBe("2026-10-15");
  });
});

describe("ContributionHistory summary", () => {
  it("shows what was put in, what it is worth and the return", () => {
    render(
      <ContributionHistory
        contributions={[contribution({}), contribution({ id: "c2", amount: 500, purchase_price: 12.5 })]}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        value={1650}
      />,
    );
    const summary = screen.getByText("Valor actual").closest("dl")!;
    expect(within(summary).getByText(/1\.500/)).toBeInTheDocument();
    expect(within(summary).getByText(/1\.650/)).toBeInTheDocument();
    expect(within(summary).getByText(/\+150/)).toBeInTheDocument();
    expect(within(summary).getByText("+10,0 %")).toBeInTheDocument();
    expect(screen.getByText("2 aportaciones · 140 participaciones")).toBeInTheDocument();
  });
});

describe("InvestmentTypeManager", () => {
  const types: InvestmentType[] = [{ id: "t1", name: "Renta variable", sort_order: 1, account_id: "acc", created_at: "" } as InvestmentType];

  it("renames a type in its own row, without a second sheet", async () => {
    mocks.updateInvestmentType.mockResolvedValue({ success: true });
    render(<InvestmentTypeManager types={types} funds={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /Tipos/ }));

    await userEvent.click(screen.getByText("Renta variable"));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    const field = screen.getByLabelText("Nuevo nombre de Renta variable");
    await userEvent.clear(field);
    await userEvent.type(field, "Acciones{Enter}");

    await waitFor(() => expect(mocks.updateInvestmentType).toHaveBeenCalledTimes(1));
    expect((mocks.updateInvestmentType.mock.calls[0][1] as FormData).get("name")).toBe("Acciones");
    expect(await screen.findByText("Acciones")).toBeInTheDocument();
  });

  it("adds a type from the field at the bottom", async () => {
    mocks.createInvestmentType.mockResolvedValue({ success: true });
    render(<InvestmentTypeManager types={types} funds={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /Tipos/ }));

    const add = screen.getByRole("button", { name: "Añadir" });
    expect(add).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Nombre del nuevo tipo"), "Monetarios");
    await userEvent.click(add);

    await waitFor(() => expect(mocks.createInvestmentType).toHaveBeenCalledTimes(1));
    expect((mocks.createInvestmentType.mock.calls[0][0] as FormData).get("name")).toBe("Monetarios");
    await waitFor(() => expect(screen.getByLabelText("Nombre del nuevo tipo")).toHaveValue(""));
  });
});
