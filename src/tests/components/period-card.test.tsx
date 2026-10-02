import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeriodCard } from "@/components/dashboard/period-card";
import type { Kpi } from "@/lib/expense-metrics";

const kpis = (income: number, expenses: number, extras: Kpi[] = []): Kpi[] => [
  { label: "Ingresos", value: income, color: "emerald" },
  { label: "Gastos", value: expenses, color: "rose" },
  ...extras,
];

describe("PeriodCard", () => {
  it("shows income, expenses and the share spent without anything to unfold", () => {
    render(<PeriodCard title="Neto octubre 2026" href="/expenses?month=10&year=2026" neto={1500} kpis={kpis(2000, -500)} />);

    expect(screen.getByText(/2\.000/)).toBeInTheDocument();
    expect(screen.getByText(/-500/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Gastado el 25\s%/ })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Neto octubre 2026/ })).toHaveAttribute("href", "/expenses?month=10&year=2026");
  });

  it("copes with spending and no income, and with an empty period", () => {
    const { rerender } = render(<PeriodCard title="Mes" href="/x" neto={-80} kpis={kpis(0, -80)} />);
    expect(screen.getByRole("img", { name: /Gastado el 100\s%/ })).toBeInTheDocument();

    rerender(<PeriodCard title="Mes" href="/x" neto={0} kpis={kpis(0, 0)} />);
    expect(screen.getByRole("img", { name: "Sin movimientos" })).toBeInTheDocument();
  });

  it("lists the extra figures, keeping a link of their own when they have one", () => {
    render(
      <PeriodCard
        title="Balance 2026"
        href="/summary?year=2026"
        neto={100}
        kpis={kpis(200, -100, [
          { label: "Media/mes", value: -10, color: "neutral" },
          { label: "Deudas", value: 40, color: "amber", href: "/expenses?category=debt" },
        ])}
      />,
    );
    expect(screen.getByText("Media/mes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /40/ })).toHaveAttribute("href", "/expenses?category=debt");
  });
});
