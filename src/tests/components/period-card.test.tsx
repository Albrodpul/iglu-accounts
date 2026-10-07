import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeriodCard } from "@/components/dashboard/period-card";
import { HeroStat } from "@/components/dashboard/hero-stat";
import type { Kpi } from "@/lib/expense-metrics";

const kpis = (income: number, expenses: number, extras: Kpi[] = []): Kpi[] => [
  { label: "Ingresos", value: income, color: "emerald" },
  { label: "Gastos", value: expenses, color: "rose" },
  ...extras,
];

describe("PeriodCard", () => {
  it("shows income and expenses next to the net, with nothing to unfold", () => {
    render(<PeriodCard title="Neto octubre 2026" href="/expenses?month=10&year=2026" neto={1500} kpis={kpis(2000, -500)} />);

    expect(screen.getByText("Ingresos").closest("div")).toHaveTextContent(/2\.000/);
    expect(screen.getByText("Gastos").closest("div")).toHaveTextContent(/-500/);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Neto octubre 2026/ })).toHaveAttribute("href", "/expenses?month=10&year=2026");
  });

  it("is plain (not a link) on the page it would lead to", () => {
    render(<PeriodCard title="Neto septiembre 2026" neto={0} kpis={kpis(0, 0)} />);
    expect(screen.getByRole("heading", { name: "Neto septiembre 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
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

describe("HeroStat", () => {
  it("shows the share of the total next to the amount when given one", () => {
    const Icon = () => null;
    const { rerender } = render(<HeroStat icon={Icon} label="Inversiones" value={49476.28} share={80.2} />);
    expect(screen.getByText(/80\s%/)).toBeInTheDocument();

    rerender(<HeroStat icon={Icon} label="Inversiones" value={49476.28} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
