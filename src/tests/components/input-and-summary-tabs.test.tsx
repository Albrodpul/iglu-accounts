import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

import { Input } from "@/components/ui/input";
import { SummaryTabs } from "@/components/summary/summary-tabs";

describe("Input type=number", () => {
  it("blurs on mouse wheel so scrolling can't change the amount", () => {
    render(<Input type="number" aria-label="importe" defaultValue="10" />);
    const input = screen.getByLabelText("importe");
    input.focus();

    fireEvent.wheel(input, { deltaY: 100 });

    expect(document.activeElement).not.toBe(input);
  });

  it("leaves text inputs focused", () => {
    render(<Input aria-label="concepto" />);
    const input = screen.getByLabelText("concepto");
    input.focus();

    fireEvent.wheel(input, { deltaY: 100 });

    expect(document.activeElement).toBe(input);
  });
});

describe("SummaryTabs", () => {
  const tabs = [
    { value: "resumen", label: "Balance del año" },
    { value: "anual", label: "Tabla por categoría y mes" },
  ];

  beforeEach(() => {
    mocks.search = "";
  });

  it("opens the view named in ?view=", () => {
    mocks.search = "year=2025&view=anual";
    render(<SummaryTabs tabs={tabs}>{null}</SummaryTabs>);
    expect(screen.getByLabelText("Vista del resumen")).toHaveValue("anual");
  });

  it("falls back to the first view for unknown values", () => {
    mocks.search = "view=nope";
    render(<SummaryTabs tabs={tabs}>{null}</SummaryTabs>);
    expect(screen.getByLabelText("Vista del resumen")).toHaveValue("resumen");
  });

  it("writes the chosen view to the URL, keeping other params", async () => {
    mocks.search = "year=2025";
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<SummaryTabs tabs={tabs}>{null}</SummaryTabs>);

    await userEvent.selectOptions(screen.getByLabelText("Vista del resumen"), "anual");

    expect(replaceState).toHaveBeenCalledWith(null, "", "?year=2025&view=anual");
  });
});
