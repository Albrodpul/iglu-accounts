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
  createInvestmentType,
  deleteInvestmentType,
  updateInvestmentType,
} from "@/actions/investments";

const ACCOUNT_ID = "11111111-1111-1111-1111-111111111111";

function buildTypeFormData(name = "Indexados") {
  const formData = new FormData();
  formData.set("name", name);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSelectedAccountId.mockResolvedValue(ACCOUNT_ID);
});

describe("investment type CRUD actions", () => {
  it("creates investment type", async () => {
    const investmentTypesQuery = createQueryBuilder({ data: null, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_types: investmentTypesQuery,
        },
      }),
    );

    const result = await createInvestmentType(buildTypeFormData());

    expect(result).toEqual({ success: true });
    expect(investmentTypesQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Indexados",
        account_id: ACCOUNT_ID,
      }),
    );
  });

  it("updates investment type", async () => {
    const investmentTypesQuery = createQueryBuilder({ data: null, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_types: investmentTypesQuery,
        },
      }),
    );

    const result = await updateInvestmentType("type-1", buildTypeFormData("ETFs"));

    expect(result).toEqual({ success: true });
    expect(investmentTypesQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ETFs",
      }),
    );
    expect(investmentTypesQuery.eq).toHaveBeenCalledWith("id", "type-1");
    expect(investmentTypesQuery.eq).toHaveBeenCalledWith("account_id", ACCOUNT_ID);
  });

  it("blocks delete when funds are associated", async () => {
    const investmentFundsQuery = createQueryBuilder({ data: [{ id: "fund-1" }], error: null });
    const investmentTypesQuery = createQueryBuilder({ data: null, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_funds: investmentFundsQuery,
          investment_types: investmentTypesQuery,
        },
      }),
    );

    const result = await deleteInvestmentType("type-1");

    expect(result).toEqual({
      error: "No puedes eliminar un tipo con fondos asociados. Elimina los fondos primero.",
    });
    expect(investmentTypesQuery.delete).not.toHaveBeenCalled();
  });

  it("deletes investment type when no associated funds", async () => {
    const investmentFundsQuery = createQueryBuilder({ data: [], error: null });
    const investmentTypesQuery = createQueryBuilder({ data: null, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_funds: investmentFundsQuery,
          investment_types: investmentTypesQuery,
        },
      }),
    );

    const result = await deleteInvestmentType("type-2");

    expect(result).toEqual({ success: true });
    expect(investmentTypesQuery.delete).toHaveBeenCalled();
    expect(investmentTypesQuery.eq).toHaveBeenCalledWith("id", "type-2");
    expect(investmentTypesQuery.eq).toHaveBeenCalledWith("account_id", ACCOUNT_ID);
  });
});
