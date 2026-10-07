import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryBuilder, createSupabaseMock } from "@/tests/utils/supabase-mock";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSelectedAccountId: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/actions/accounts", () => ({ getSelectedAccountId: mocks.getSelectedAccountId }));
vi.mock("@/actions/categories", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { deleteExpenses, setExpensesCategory } from "@/actions/expenses";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const FOOD = "22222222-2222-4222-8222-222222222222";
const HOME = "33333333-3333-4333-8333-333333333333";
const INCOME = "44444444-4444-4444-8444-444444444444";
const E1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const E2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const E3 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const PAIR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const categories = [
  { id: FOOD, name: "Comida" },
  { id: HOME, name: "Hogar" },
  { id: INCOME, name: "Ingreso" },
];

function setup(rows: { id: string; category_id: string | null; transfer_pair_id: string | null }[]) {
  const expensesQuery = createQueryBuilder({ data: rows, error: null });
  const categoriesQuery = createQueryBuilder({ data: categories, error: null });
  mocks.createClient.mockResolvedValue(
    createSupabaseMock({ user: { id: "user-1" }, tables: { expenses: expensesQuery, categories: categoriesQuery } }),
  );
  return expensesQuery;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSelectedAccountId.mockResolvedValue(ACCOUNT_ID);
});

describe("deleteExpenses", () => {
  it("rejects ids that are not uuids without touching the database", async () => {
    const query = setup([]);
    const result = await deleteExpenses(["nope"]);
    expect(result).toEqual({ error: "Movimiento inválido" });
    expect(query.delete).not.toHaveBeenCalled();
  });

  it("rejects an empty selection", async () => {
    setup([]);
    expect(await deleteExpenses([])).toEqual({ error: "No hay movimientos seleccionados" });
  });

  it("deletes plain movements by id and transfers by pair, scoped to the user", async () => {
    const query = setup([
      { id: E1, category_id: FOOD, transfer_pair_id: null },
      { id: E2, category_id: null, transfer_pair_id: PAIR },
    ]);

    const result = await deleteExpenses([E1, E2]);

    expect(result).toMatchObject({ success: true });
    expect(query.in).toHaveBeenCalledWith("id", [E1]);
    expect(query.in).toHaveBeenCalledWith("transfer_pair_id", [PAIR]);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/expenses");
  });
});

describe("setExpensesCategory", () => {
  it("refuses a category from another account", async () => {
    const query = setup([{ id: E1, category_id: FOOD, transfer_pair_id: null }]);
    const result = await setExpensesCategory([E1], "99999999-9999-4999-8999-999999999999");
    expect(result).toEqual({ error: "Categoría no válida" });
    expect(query.update).not.toHaveBeenCalled();
  });

  it("refuses the bookkeeping categories as a target", async () => {
    setup([{ id: E1, category_id: FOOD, transfer_pair_id: null }]);
    expect(await setExpensesCategory([E1], INCOME)).toEqual({ error: "Categoría no válida" });
  });

  it("leaves incomes and transfers alone and reports them as skipped", async () => {
    const query = setup([
      { id: E1, category_id: FOOD, transfer_pair_id: null },
      { id: E2, category_id: INCOME, transfer_pair_id: null },
      { id: E3, category_id: null, transfer_pair_id: PAIR },
    ]);
    // Only the first `in` (the lookup) should see all three ids.
    const result = await setExpensesCategory([E1, E2, E3], HOME);

    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ category_id: HOME }));
    expect(query.in).toHaveBeenLastCalledWith("id", [E1]);
    expect(result).toMatchObject({ success: true });
  });
});
