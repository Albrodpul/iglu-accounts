import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, ExpenseWithCategory } from "@/types";

const mocks = vi.hoisted(() => ({
  deleteExpense: vi.fn(),
  toast: Object.assign(vi.fn(), { dismiss: vi.fn(), error: vi.fn(), success: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }) }));
vi.mock("@/actions/expenses", () => ({
  deleteExpense: mocks.deleteExpense,
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
const transfer = category("cat-transfer", "Traspaso");

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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.toast.mockReturnValue("toast-1");
});

describe("ExpenseList delete", () => {
  it("hides both legs of a transfer when one is deleted", async () => {
    const legs = [
      movement({ id: "out", concept: "Retirada", amount: -50, category_id: transfer.id, category: transfer, transfer_pair_id: "p1" }),
      movement({ id: "in", concept: "Ingreso efectivo", amount: 50, category_id: transfer.id, category: transfer, transfer_pair_id: "p1", payment_method: "cash" }),
      movement({ id: "other", concept: "Pan" }),
    ];
    render(<ExpenseList expenses={legs} categories={[food, transfer]} transferCategoryId={transfer.id} />);

    const row = screen.getByText("Retirada").closest("[class*='group']") as HTMLElement;
    const buttons = within(row).getAllByRole("button");
    await userEvent.click(buttons[buttons.length - 1]); // trash (desktop control)

    expect(screen.queryByText("Retirada")).not.toBeInTheDocument();
    expect(screen.queryByText("Ingreso efectivo")).not.toBeInTheDocument();
    expect(screen.getByText("Pan")).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith("Traspaso eliminado", expect.anything());
  });

  it("offers «Eliminar» inside the edit sheet and schedules an undoable delete", async () => {
    render(<ExpenseList expenses={[movement({ concept: "Pan" })]} categories={[food]} />);

    await userEvent.click(screen.getByText("Pan")); // tap the row → edit sheet
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

    expect(screen.queryByText("Pan")).not.toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith("Movimiento eliminado", expect.anything());
    expect(mocks.deleteExpense).not.toHaveBeenCalled(); // only after the undo window
  });
});
