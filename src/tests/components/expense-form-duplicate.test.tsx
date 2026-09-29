import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/types";

const mocks = vi.hoisted(() => ({
  createExpense: vi.fn(),
  checkDuplicate: vi.fn(),
  suggestCategory: vi.fn(),
}));

vi.mock("@/actions/expenses", () => ({
  createExpense: mocks.createExpense,
  updateExpense: vi.fn(),
  createTransfer: vi.fn(),
  updateTransfer: vi.fn(),
  checkDuplicate: mocks.checkDuplicate,
  suggestCategory: mocks.suggestCategory,
}));

vi.mock("@/actions/categories", () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}));

import { ExpenseForm } from "@/components/expenses/expense-form";

const categories: Category[] = [
  {
    id: "cat-food",
    name: "Comida",
    icon: "🍎",
    color: "#10b981",
    sort_order: 1,
    account_id: "acc-1",
    created_at: "2026-01-01T00:00:00Z",
  },
];

async function submitExpense() {
  render(<ExpenseForm categories={categories} />);
  await userEvent.type(screen.getByLabelText("Importe"), "12.5");
  await userEvent.click(screen.getByRole("button", { name: "Añadir gasto" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.suggestCategory.mockResolvedValue(null);
  mocks.createExpense.mockResolvedValue({ success: true });
  mocks.checkDuplicate.mockResolvedValue({ duplicate: true, concept: "Súper" });
});

describe("ExpenseForm duplicate check", () => {
  it("asks in an in-app dialog (not window.confirm) and aborts on cancel", async () => {
    const nativeConfirm = vi.spyOn(window, "confirm");

    await submitExpense();

    expect(await screen.findByText("Posible duplicado")).toBeInTheDocument();
    expect(screen.getByText(/Ya existe un movimiento similar: "Súper"/)).toBeInTheDocument();
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(mocks.checkDuplicate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: -12.5, category_id: "cat-food" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByText("Posible duplicado")).not.toBeInTheDocument());
    expect(mocks.createExpense).not.toHaveBeenCalled();
  });

  it("creates the movement when the user confirms", async () => {
    await submitExpense();

    await userEvent.click(await screen.findByRole("button", { name: "Añadir igualmente" }));

    await waitFor(() => expect(mocks.createExpense).toHaveBeenCalledTimes(1));
  });

  it("creates directly when there is no duplicate", async () => {
    mocks.checkDuplicate.mockResolvedValue({ duplicate: false });

    await submitExpense();

    await waitFor(() => expect(mocks.createExpense).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Posible duplicado")).not.toBeInTheDocument();
  });
});
