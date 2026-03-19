import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryBuilder, createSupabaseMock } from "@/tests/utils/supabase-mock";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSelectedAccountId: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/actions/accounts", () => ({
  getSelectedAccountId: mocks.getSelectedAccountId,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "@/actions/categories";

const ACCOUNT_ID = "11111111-1111-1111-1111-111111111111";

function buildCategoryFormData() {
  const formData = new FormData();
  formData.set("name", "Supermercado");
  formData.set("icon", "🛒");
  formData.set("color", "#22c55e");
  formData.set("sort_order", "1");
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSelectedAccountId.mockResolvedValue(ACCOUNT_ID);
});

describe("categories CRUD actions", () => {
  it("reads categories filtered by selected account", async () => {
    const categoriesQuery = createQueryBuilder({
      data: [{ id: "cat-1", name: "Super" }],
      error: null,
    });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          categories: categoriesQuery,
        },
      }),
    );

    const result = await getCategories();

    expect(categoriesQuery.select).toHaveBeenCalledWith("*");
    expect(categoriesQuery.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(categoriesQuery.eq).toHaveBeenCalledWith("account_id", ACCOUNT_ID);
    expect(result).toEqual([{ id: "cat-1", name: "Super" }]);
  });

  it("creates category and revalidates views", async () => {
    const categoriesQuery = createQueryBuilder({ data: null, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          categories: categoriesQuery,
        },
      }),
    );

    const result = await createCategory(buildCategoryFormData());

    expect(result).toEqual({ success: true });
    expect(categoriesQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Supermercado",
        icon: "🛒",
        color: "#22c55e",
        account_id: ACCOUNT_ID,
        sort_order: 1,
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/expenses");
  });

  it("updates category and revalidates summary", async () => {
    const categoriesQuery = createQueryBuilder({ data: null, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          categories: categoriesQuery,
        },
      }),
    );

    const result = await updateCategory("cat-1", buildCategoryFormData());

    expect(result).toEqual({ success: true });
    expect(categoriesQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Supermercado",
        icon: "🛒",
        color: "#22c55e",
      }),
    );
    expect(categoriesQuery.eq).toHaveBeenCalledWith("id", "cat-1");
    expect(categoriesQuery.eq).toHaveBeenCalledWith("account_id", ACCOUNT_ID);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/summary");
  });

  it("deletes category", async () => {
    const categoriesQuery = createQueryBuilder({ data: null, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          categories: categoriesQuery,
        },
      }),
    );

    const result = await deleteCategory("cat-2");

    expect(result).toEqual({ success: true });
    expect(categoriesQuery.delete).toHaveBeenCalled();
    expect(categoriesQuery.eq).toHaveBeenCalledWith("id", "cat-2");
    expect(categoriesQuery.eq).toHaveBeenCalledWith("account_id", ACCOUNT_ID);
  });

  it("returns account error when no account is selected", async () => {
    mocks.getSelectedAccountId.mockResolvedValue(null);
    mocks.createClient.mockResolvedValue(createSupabaseMock({ user: { id: "user-1" } }));

    const result = await createCategory(buildCategoryFormData());

    expect(result).toEqual({ error: "No hay cuenta seleccionada" });
  });
});
