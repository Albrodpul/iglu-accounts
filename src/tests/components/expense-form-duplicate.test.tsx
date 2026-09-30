import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Expense } from "@/types";

const mocks = vi.hoisted(() => ({
  createExpense: vi.fn(),
  checkDuplicate: vi.fn(),
  suggestCategory: vi.fn(),
  getEntryHints: vi.fn(),
}));

vi.mock("@/actions/expenses", () => ({
  createExpense: mocks.createExpense,
  updateExpense: vi.fn(),
  createTransfer: vi.fn(),
  updateTransfer: vi.fn(),
  checkDuplicate: mocks.checkDuplicate,
  suggestCategory: mocks.suggestCategory,
  getEntryHints: mocks.getEntryHints,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

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
  mocks.getEntryHints.mockResolvedValue({ concepts: [], categoryUsage: {} });
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

  it("recovers when the server action throws (offline / 5xx)", async () => {
    mocks.checkDuplicate.mockResolvedValue({ duplicate: false });
    mocks.createExpense.mockRejectedValue(new Error("Failed to fetch"));

    await submitExpense();

    expect(await screen.findByText(/No se pudo guardar/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Añadir gasto" })).toBeEnabled();
  });

  it("creates directly when there is no duplicate", async () => {
    mocks.checkDuplicate.mockResolvedValue({ duplicate: false });

    await submitExpense();

    await waitFor(() => expect(mocks.createExpense).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Posible duplicado")).not.toBeInTheDocument();
  });
});

describe("ExpenseForm quick entry", () => {
  const categoriesWithTwo: Category[] = [
    ...categories,
    { ...categories[0], id: "cat-fuel", name: "Gasolina", icon: "⛽", sort_order: 2 },
  ];

  it("Hoy / Ayer chips set the date", async () => {
    render(<ExpenseForm categories={categories} />);
    const date = screen.getByLabelText("Fecha") as HTMLInputElement;
    const hoy = screen.getByRole("button", { name: "Hoy" });

    expect(hoy).toHaveAttribute("aria-pressed", "true"); // defaults to today

    await userEvent.click(screen.getByRole("button", { name: "Ayer" }));
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    expect(date.value).toBe(`${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`);
    expect(hoy).toHaveAttribute("aria-pressed", "false");
  });

  it("a frequent-concept chip fills concept + category and focuses the amount", async () => {
    mocks.getEntryHints.mockResolvedValue({
      concepts: [
        { concept: "Repsol", category_id: "cat-fuel", kind: "expense", count: 6 },
        { concept: "Nómina", category_id: "cat-food", kind: "income", count: 4 },
      ],
      categoryUsage: {},
    });
    render(<ExpenseForm categories={categoriesWithTwo} />);

    await userEvent.click(await screen.findByRole("button", { name: "Repsol" }));

    expect(screen.getByLabelText("Concepto")).toHaveValue("Repsol");
    expect(screen.getByLabelText("Categoría")).toHaveTextContent("Gasolina"); // picker shows the category
    expect(screen.getByLabelText("Importe")).toHaveFocus();
    // Income concepts only appear for income movements.
    expect(screen.queryByRole("button", { name: "Nómina" })).not.toBeInTheDocument();
  });

  it("the amount shows the sign of the movement type", async () => {
    render(<ExpenseForm categories={categories} />);
    const field = screen.getByLabelText("Importe").parentElement!;

    expect(field).toHaveTextContent("−");
    await userEvent.click(screen.getByRole("button", { name: "Ingreso" }));
    expect(field).toHaveTextContent("+");
  });
});

describe("ExpenseForm duplicating a movement", () => {
  const source: Expense = {
    id: "exp-1",
    user_id: "user-1",
    category_id: "cat-food",
    account_id: "acc-1",
    amount: -42.3,
    concept: "Mercadona",
    expense_date: "2026-01-15",
    payment_method: "bank",
    transfer_pair_id: null,
    is_recurring: false,
    notes: "Compra semanal",
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
  };

  it("prefill copies the movement in create mode, dated today", async () => {
    mocks.checkDuplicate.mockResolvedValue({ duplicate: false });
    render(<ExpenseForm categories={categories} prefill={source} />);

    expect(screen.getByLabelText("Importe")).toHaveValue(42.3);
    expect(screen.getByLabelText("Concepto")).toHaveValue("Mercadona");
    expect(screen.getByLabelText("Notas (opcional)")).toHaveValue("Compra semanal");
    expect(screen.getByRole("button", { name: "Hoy" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Añadir gasto" }));

    await waitFor(() => expect(mocks.createExpense).toHaveBeenCalledTimes(1));
    const data = mocks.createExpense.mock.calls[0][0] as FormData;
    expect(data.get("concept")).toBe("Mercadona");
    expect(data.get("category_id")).toBe("cat-food");
    expect(data.get("expense_date")).not.toBe("2026-01-15");
  });

  it("the edit form offers Duplicar", async () => {
    const onDuplicate = vi.fn();
    render(<ExpenseForm categories={categories} expense={source} onDuplicate={onDuplicate} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Duplicar" }));

    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });
});
