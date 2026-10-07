import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, ExpenseWithCategory } from "@/types";

const mocks = vi.hoisted(() => ({
  deleteExpenses: vi.fn(),
  setExpensesCategory: vi.fn(),
  toast: Object.assign(vi.fn(), { dismiss: vi.fn(), error: vi.fn(), success: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }) }));
vi.mock("@/actions/expenses", () => ({
  deleteExpense: vi.fn(),
  deleteExpenses: mocks.deleteExpenses,
  setExpensesCategory: mocks.setExpensesCategory,
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  createTransfer: vi.fn(),
  updateTransfer: vi.fn(),
  checkDuplicate: vi.fn(),
  suggestCategory: vi.fn(),
  getEntryHints: vi.fn().mockResolvedValue({ concepts: [], categoryUsage: {} }),
}));
vi.mock("@/actions/categories", () => ({ createCategory: vi.fn(), updateCategory: vi.fn() }));

import { ExpenseList } from "@/components/expenses/expense-list";

const category = (id: string, name: string): Category => ({
  id,
  name,
  icon: "📦",
  color: "#64748b",
  sort_order: 1,
  account_id: "acc",
  created_at: "2026-01-01T00:00:00Z",
});

const food = category("cat-food", "Comida");
const home = category("cat-home", "Hogar");
const income = category("cat-income", "Ingreso");
const transfer = category("cat-transfer", "Traspaso");
const categories = [food, home, income, transfer];

const movement = (over: Partial<ExpenseWithCategory>): ExpenseWithCategory => ({
  id: "e1",
  user_id: "u",
  category_id: food.id,
  account_id: "acc",
  amount: -10,
  concept: "Pan",
  expense_date: "2026-09-10",
  payment_method: "bank",
  transfer_pair_id: null,
  is_recurring: false,
  notes: null,
  created_at: "2026-09-10T10:00:00Z",
  updated_at: "2026-09-10T10:00:00Z",
  category: food,
  ...over,
});

const rows = [
  movement({ id: "pan", concept: "Pan", amount: -10 }),
  movement({ id: "luz", concept: "Luz", amount: -40 }),
  movement({ id: "out", concept: "Retirada", amount: -50, category_id: transfer.id, category: transfer, transfer_pair_id: "p1" }),
  movement({ id: "in", concept: "A efectivo", amount: 50, category_id: transfer.id, category: transfer, transfer_pair_id: "p1", payment_method: "cash" }),
];

const onMutated = vi.fn();

function Harness({ initial = false }: { initial?: boolean }) {
  const [selecting, setSelecting] = useState(initial);
  return (
    <>
      <output data-testid="mode">{selecting ? "on" : "off"}</output>
      <ExpenseList
        expenses={rows}
        categories={categories}
        transferCategoryId={transfer.id}
        selecting={selecting}
        onSelectingChange={setSelecting}
        onMutated={onMutated}
      />
    </>
  );
}

const checkbox = (name: string) => screen.getByRole("checkbox", { name: `Seleccionar ${name}` });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ExpenseList selection mode", () => {
  it("shows no checkboxes until a row is long-pressed", () => {
    vi.useFakeTimers();
    render(<Harness />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();

    const row = screen.getByText("Luz").closest(".group") as HTMLElement;
    fireEvent.touchStart(row, { touches: [{ clientX: 100, clientY: 100 }] });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.touchEnd(row);

    expect(screen.getByTestId("mode")).toHaveTextContent("on");
    expect(checkbox("Luz")).toBeChecked();
    expect(checkbox("Pan")).not.toBeChecked();
    expect(within(screen.getByRole("toolbar")).getByText("1 seleccionado")).toBeInTheDocument();
  });

  it("a finger that moves is a scroll or a swipe, not a long press", () => {
    vi.useFakeTimers();
    render(<Harness />);
    const row = screen.getByText("Luz").closest(".group") as HTMLElement;
    fireEvent.touchStart(row, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 100, clientY: 140 }] });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("off");
  });

  it("taps toggle rows instead of opening the editor, and a transfer goes as a pair", async () => {
    const user = userEvent.setup();
    render(<Harness initial />);

    await user.click(screen.getByText("Pan"));
    expect(checkbox("Pan")).toBeChecked();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByText("Retirada"));
    expect(checkbox("A efectivo")).toBeChecked();
    expect(within(screen.getByRole("toolbar")).getByText("3 seleccionados")).toBeInTheDocument();

    await user.click(screen.getByText("Pan"));
    expect(checkbox("Pan")).not.toBeChecked();
  });

  it("changes the category of the selection and leaves selection mode", async () => {
    mocks.setExpensesCategory.mockResolvedValue({ success: true, updated: 2, skipped: 0 });
    const user = userEvent.setup();
    render(<Harness initial />);

    await user.click(screen.getByText("Pan"));
    await user.click(screen.getByText("Luz"));
    await user.click(within(screen.getByRole("toolbar")).getByRole("button", { name: "Categoría" }));

    const sheet = screen.getByRole("dialog", { name: "Cambiar categoría" });
    // Bookkeeping categories are never a target.
    expect(within(sheet).queryByRole("button", { name: /Ingreso/ })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: /Traspaso/ })).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: /Hogar/ }));

    expect(mocks.setExpensesCategory).toHaveBeenCalledWith(["pan", "luz"], home.id);
    expect(mocks.toast.success).toHaveBeenCalledWith("2 movimientos en Hogar", undefined);
    expect(screen.getByTestId("mode")).toHaveTextContent("off");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(onMutated).toHaveBeenCalled();
  });

  it("says so when part of the selection keeps its category", async () => {
    mocks.setExpensesCategory.mockResolvedValue({ success: true, updated: 1, skipped: 2 });
    const user = userEvent.setup();
    render(<Harness initial />);

    await user.click(within(screen.getByRole("toolbar")).getByRole("button", { name: "Todos" }));
    await user.click(screen.getByText("Luz"));
    await user.click(within(screen.getByRole("toolbar")).getByRole("button", { name: "Categoría" }));
    await user.click(within(screen.getByRole("dialog", { name: "Cambiar categoría" })).getByRole("button", { name: /Hogar/ }));

    expect(mocks.setExpensesCategory).toHaveBeenCalledWith(["pan", "out", "in"], home.id);
    expect(mocks.toast.success).toHaveBeenCalledWith(
      "1 movimiento en Hogar",
      expect.objectContaining({ description: expect.stringContaining("2 movimientos sin cambios") }),
    );
  });

  it("deletes only after confirming", async () => {
    mocks.deleteExpenses.mockResolvedValue({ success: true, deleted: 2 });
    const user = userEvent.setup();
    render(<Harness initial />);
    const toolbar = screen.getByRole("toolbar");

    expect(within(toolbar).getByRole("button", { name: "Eliminar" })).toBeDisabled();
    await user.click(screen.getByText("Pan"));
    await user.click(screen.getByText("Luz"));

    await user.click(within(toolbar).getByRole("button", { name: "Eliminar" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(mocks.deleteExpenses).not.toHaveBeenCalled();
    expect(screen.getByTestId("mode")).toHaveTextContent("on");

    await user.click(within(toolbar).getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Eliminar 2 movimientos")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(mocks.deleteExpenses).toHaveBeenCalledWith(["pan", "luz"]);
    expect(mocks.toast.success).toHaveBeenCalledWith("2 movimientos eliminados");
    expect(screen.getByTestId("mode")).toHaveTextContent("off");
  });

  it("leaves with the close button, dropping the selection", async () => {
    const user = userEvent.setup();
    render(<Harness initial />);
    await user.click(screen.getByText("Pan"));
    await user.click(screen.getByRole("button", { name: "Salir de la selección" }));
    expect(screen.getByTestId("mode")).toHaveTextContent("off");
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });
});
