import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContributionForm, ContributionHistory, ProfitabilityForm } from "@/components/investments/fund-forms";
import { DecimalInput } from "@/components/ui/decimal-input";
import type { InvestmentContribution, InvestmentFundWithType } from "@/types";

const fund = {
  id: "f1",
  name: "Fidelity MSCI World",
  invested_amount: 1000,
  current_value: 1071,
  show_negative_returns: true,
} as InvestmentFundWithType;

const contribution = (over: Partial<InvestmentContribution>): InvestmentContribution => ({
  id: "c1",
  fund_id: "f1",
  account_id: "acc",
  amount: 953.86,
  purchase_price: 14.2049,
  units: 67.15,
  contribution_date: "2026-08-13",
  notes: null,
  created_at: "2026-08-13T10:00:00Z",
  ...over,
});

const submitted = (onSubmit: ReturnType<typeof vi.fn>) => onSubmit.mock.calls[0][0] as FormData;

describe("DecimalInput", () => {
  it("accepts a comma and hands the form a plain number", async () => {
    const { container } = render(<DecimalInput aria-label="Precio" name="purchase_price" />);
    await userEvent.type(screen.getByLabelText("Precio"), "12,72");
    expect(container.querySelector<HTMLInputElement>('input[name="purchase_price"]')!.value).toBe("12.72");
  });

  it("shows an existing value with a comma and flags text that isn't a number", async () => {
    render(<DecimalInput aria-label="Precio" name="purchase_price" defaultValue={14.2049} />);
    const field = screen.getByLabelText("Precio");
    expect(field).toHaveValue("14,2049");
    await userEvent.clear(field);
    await userEvent.type(field, "abc");
    expect(field).toBeInvalid();
  });
});

describe("ProfitabilityForm", () => {
  it("shows the resulting value live and submits a gain as positive", async () => {
    const onSubmit = vi.fn();
    render(<ProfitabilityForm fund={fund} loading={false} onSubmit={onSubmit} />);

    const amount = screen.getByLabelText("Ganancia acumulada");
    expect(amount).toHaveValue("71");
    await userEvent.clear(amount);
    await userEvent.type(amount, "100");
    expect(screen.getByText(/1\.100/)).toBeInTheDocument(); // 1.000 invested + 100
    expect(screen.getByText(/\+10,0/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(submitted(onSubmit).get("return_amount")).toBe("100");
  });

  it("enters a loss by choosing it, without typing a minus sign", async () => {
    const onSubmit = vi.fn();
    render(<ProfitabilityForm fund={fund} loading={false} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Pérdida" }));
    const amount = screen.getByLabelText("Pérdida acumulada");
    await userEvent.clear(amount);
    await userEvent.type(amount, "50");
    expect(screen.getByText(/950/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(submitted(onSubmit).get("return_amount")).toBe("-50");
  });

  it("starts on 'Pérdida' for a fund that is losing", () => {
    render(<ProfitabilityForm fund={{ ...fund, current_value: 900 }} loading={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Pérdida" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Pérdida acumulada")).toHaveValue("100");
  });
});

describe("ContributionForm", () => {
  it("works out the units from amount and price, and submits plain numbers", async () => {
    const onSubmit = vi.fn();
    render(<ContributionForm fund={fund} contribution={null} today="2026-10-02" loading={false} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Importe"), "1000");
    await userEvent.type(screen.getByLabelText("Precio (€/part.)"), "12,5");
    expect(screen.getByText("≈ 80 participaciones")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Registrar aportación" }));
    const data = submitted(onSubmit);
    expect(data.get("amount")).toBe("1000");
    expect(data.get("purchase_price")).toBe("12.5");
    expect(data.get("units")).toBe("");
    expect(data.get("fund_id")).toBe("f1");
  });

  it("warns when units × price don't match the amount", async () => {
    render(<ContributionForm fund={fund} contribution={null} today="2026-10-02" loading={false} onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Importe"), "1000");
    await userEvent.type(screen.getByLabelText("Precio (€/part.)"), "10");
    await userEvent.type(screen.getByLabelText("Participaciones"), "50");
    expect(screen.getByText(/Revisa los datos/)).toBeInTheDocument();
  });
});

describe("ContributionHistory", () => {
  const rows = [contribution({}), contribution({ id: "c2", amount: 6000, purchase_price: 12.724, units: null, contribution_date: "2026-01-09", notes: "Aportación inicial" })];

  it("summarises the contributions and writes each one in plain Spanish", () => {
    render(<ContributionHistory contributions={rows} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText(/6\.953,86/)).toBeInTheDocument(); // total
    expect(screen.getByText(/13 ago 2026 · 67,15 participaciones a 14,2049 €/)).toBeInTheDocument();
    // No units recorded: derived from amount / price.
    expect(screen.getByText(/9 ene 2026 · 471,5498 participaciones a 12,724 €/)).toBeInTheDocument();
    expect(screen.getByText("Aportación inicial")).toBeInTheDocument();
  });

  it("opens a contribution for editing on tap", async () => {
    const onEdit = vi.fn();
    render(<ContributionHistory contributions={rows} loading={false} onEdit={onEdit} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByText(/13 ago 2026/));
    expect(onEdit).toHaveBeenCalledWith(rows[0]);
  });
});
