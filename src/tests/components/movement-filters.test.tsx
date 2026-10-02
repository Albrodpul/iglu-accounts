import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "@/types";
import { breakdownByCategory, summarizeMovements } from "@/lib/filter-summary";

vi.mock("@/actions/categories", () => ({ createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn() }));

import { MovementFilters } from "@/components/expenses/movement-filters";
import { CategoryBreakdown } from "@/components/expenses/category-breakdown";

const category = (id: string, name: string, icon: string): Category => ({
  id,
  name,
  icon,
  color: "#64748b",
  sort_order: 1,
  account_id: "acc",
  created_at: "2026-01-01T00:00:00Z",
});
const categories = [category("fuel", "Gasolina", "⛽"), category("food", "Comida", "🍎")];

function setup(over: Partial<React.ComponentProps<typeof MovementFilters>> = {}) {
  const props = {
    search: "",
    onSearchChange: vi.fn(),
    categoryId: "",
    onCategoryChange: vi.fn(),
    sortAsc: false,
    onSortChange: vi.fn(),
    categories,
    ...over,
  };
  render(<MovementFilters {...props} />);
  return props;
}

describe("MovementFilters", () => {
  it("picks a category from the filters sheet and closes it", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
    const sheet = await screen.findByRole("dialog", { name: "Filtros" });
    await userEvent.click(within(sheet).getByRole("button", { name: /Gasolina/ }));

    expect(props.onCategoryChange).toHaveBeenCalledWith("fuel");
    expect(screen.queryByRole("dialog", { name: "Filtros" })).not.toBeInTheDocument();
  });

  it("changes the order from the sheet without closing it", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
    const sheet = await screen.findByRole("dialog", { name: "Filtros" });
    await userEvent.click(within(sheet).getByRole("button", { name: "Más antiguo" }));

    expect(props.onSortChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("dialog", { name: "Filtros" })).toBeInTheDocument();
  });

  it("shows active filters as chips that undo them, and counts them on the button", async () => {
    const props = setup({ categoryId: "fuel", sortAsc: true });

    expect(screen.getByRole("button", { name: "Filtros (2 activos)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro Gasolina" }));
    expect(props.onCategoryChange).toHaveBeenCalledWith("");
    await userEvent.click(screen.getByRole("button", { name: "Volver a más reciente primero" }));
    expect(props.onSortChange).toHaveBeenCalledWith(false);
  });

  it("shows how many movements match and their total, only while filtering", () => {
    setup({ categoryId: "fuel", summary: { count: 8, total: -241.3 } });
    expect(screen.getByText("8 movimientos")).toBeInTheDocument();
    expect(screen.getByText(/241,30/)).toBeInTheDocument();
  });

  it("hides the summary when nothing is filtered", () => {
    setup({ summary: { count: 50, total: -900 } });
    expect(screen.queryByText("50 movimientos")).not.toBeInTheDocument();
  });

  it("clears the search with one tap", async () => {
    const props = setup({ search: "corolla" });
    await userEvent.click(screen.getByRole("button", { name: "Borrar búsqueda" }));
    expect(props.onSearchChange).toHaveBeenCalledWith("");
  });
});

describe("summarizeMovements", () => {
  const rows = [
    { amount: -30, category_id: "fuel" },
    { amount: -20.5, category_id: "fuel" },
    { amount: 100, category_id: "debt" },
    { amount: -50, category_id: "transfer" },
  ];

  it("leaves debts and transfers out of the total, like the day headers", () => {
    expect(summarizeMovements(rows, { debtCategoryId: "debt", transferCategoryId: "transfer" })).toEqual({
      count: 4,
      total: -50.5,
    });
  });

  it("counts them when the filter is that very category", () => {
    const debts = rows.filter((r) => r.category_id === "debt");
    expect(summarizeMovements(debts, { categoryId: "debt", debtCategoryId: "debt", transferCategoryId: "transfer" })).toEqual({
      count: 1,
      total: 100,
    });
  });
});

describe("breakdownByCategory", () => {
  const rows = [
    { amount: -30, category_id: "fuel" },
    { amount: -20.5, category_id: "fuel" },
    { amount: -80, category_id: "food" },
    { amount: 2500, category_id: "salary" },
    { amount: 100, category_id: "debt" },
    { amount: -50, category_id: "transfer" },
    { amount: 50, category_id: "transfer" },
  ];
  const special = { debtCategoryId: "debt", transferCategoryId: "transfer" };

  it("totals each category, biggest first, without debts or transfers", () => {
    expect(breakdownByCategory(rows, special)).toEqual([
      { categoryId: "salary", count: 1, total: 2500 },
      { categoryId: "food", count: 1, total: -80 },
      { categoryId: "fuel", count: 2, total: -50.5 },
    ]);
  });

  it("adds up to the total shown next to it", () => {
    const sum = breakdownByCategory(rows, special).reduce((s, e) => s + e.total, 0);
    expect(sum).toBe(summarizeMovements(rows, special).total);
  });
});

describe("CategoryBreakdown", () => {
  const entries = [
    { categoryId: "fuel", count: 2, total: -50.5 },
    { categoryId: "food", count: 1, total: -80 },
  ];

  it("filters by the category clicked, and clears it when clicked again", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <CategoryBreakdown entries={entries} categories={categories} selectedId="" onSelect={onSelect} caption="Septiembre 2026" />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Gasolina/ }));
    expect(onSelect).toHaveBeenCalledWith("fuel");

    rerender(
      <CategoryBreakdown entries={entries} categories={categories} selectedId="fuel" onSelect={onSelect} caption="Septiembre 2026" />,
    );
    const active = screen.getByRole("button", { name: /Gasolina/ });
    expect(active).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(active);
    expect(onSelect).toHaveBeenLastCalledWith("");
  });
});
