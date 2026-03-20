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
  createContribution,
  createInvestmentFund,
  deleteContribution,
  getInvestmentSummary,
  updateContribution,
  updateInvestmentFund,
  updateFundProfitability,
} from "@/actions/investments";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const TYPE_ID = "22222222-2222-4222-8222-222222222222";
const FUND_ID = "33333333-3333-4333-8333-333333333333";

function buildFundFormData(overrides?: Record<string, string>) {
  const formData = new FormData();
  formData.set("name", "MSCI World");
  formData.set("type_id", TYPE_ID);
  formData.set("initial_amount", "1000");
  formData.set("contribution_date", "2026-03-19");

  for (const [key, value] of Object.entries(overrides ?? {})) {
    formData.set(key, value);
  }

  return formData;
}

function buildContributionFormData(overrides?: Record<string, string>) {
  const formData = new FormData();
  formData.set("fund_id", FUND_ID);
  formData.set("amount", "200");
  formData.set("contribution_date", "2026-03-19");
  formData.set("notes", "DCA");

  for (const [key, value] of Object.entries(overrides ?? {})) {
    formData.set(key, value);
  }

  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSelectedAccountId.mockResolvedValue(ACCOUNT_ID);
});

describe("investment funds and contributions", () => {
  it("creates fund and initial contribution when amount is positive", async () => {
    const fundsQuery = createQueryBuilder({ data: { id: FUND_ID }, error: null });
    const contributionsQuery = createQueryBuilder({ data: null, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_funds: fundsQuery,
          investment_contributions: contributionsQuery,
        },
      }),
    );

    const result = await createInvestmentFund(buildFundFormData());

    expect(result).toEqual({ success: true });
    expect(fundsQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "MSCI World",
        type_id: TYPE_ID,
        invested_amount: 1000,
        current_value: 1000,
        account_id: ACCOUNT_ID,
      }),
    );
    expect(contributionsQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        fund_id: FUND_ID,
        account_id: ACCOUNT_ID,
        amount: 1000,
      }),
    );
  });

  it("updates fund name only", async () => {
    const fundsQuery = createQueryBuilder({ data: null, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_funds: fundsQuery,
        },
      }),
    );

    const formData = new FormData();
    formData.set("name", "MSCI World Core");

    const result = await updateInvestmentFund(FUND_ID, formData);

    expect(result).toEqual({ success: true });
    expect(fundsQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "MSCI World Core",
      }),
    );
    expect(fundsQuery.update).toHaveBeenCalledWith(
      expect.not.objectContaining({
        current_value: expect.anything(),
      }),
    );
  });

  it("updates fund profitability from invested plus return", async () => {
    const fundsQuery = createQueryBuilder({ data: { invested_amount: 1000 }, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_funds: fundsQuery,
        },
      }),
    );

    const formData = new FormData();
    formData.set("return_amount", "120");

    const result = await updateFundProfitability(FUND_ID, formData);

    expect(result).toEqual({ success: true });
    expect(fundsQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_value: 1120,
      }),
    );
  });

  it("creates contribution and increments fund totals", async () => {
    const contributionsQuery = createQueryBuilder({ data: null, error: null });
    const fundsQuery = createQueryBuilder({ data: { invested_amount: 1000, current_value: 1100 }, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_contributions: contributionsQuery,
          investment_funds: fundsQuery,
        },
      }),
    );

    const result = await createContribution(buildContributionFormData());

    expect(result).toEqual({ success: true });
    expect(contributionsQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        fund_id: FUND_ID,
        amount: 200,
        account_id: ACCOUNT_ID,
      }),
    );
    expect(fundsQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        invested_amount: 1200,
        current_value: 1300,
      }),
    );
  });

  it("updates contribution and adjusts fund totals by diff", async () => {
    const contributionsQuery = createQueryBuilder({ data: { amount: 150, fund_id: FUND_ID }, error: null });
    const fundsQuery = createQueryBuilder({ data: { invested_amount: 1000, current_value: 1100 }, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_contributions: contributionsQuery,
          investment_funds: fundsQuery,
        },
      }),
    );

    const result = await updateContribution("contrib-1", buildContributionFormData({ amount: "250" }));

    expect(result).toEqual({ success: true });
    expect(fundsQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        invested_amount: 1100,
        current_value: 1200,
      }),
    );
  });

  it("deletes contribution and decrements fund totals", async () => {
    const contributionsQuery = createQueryBuilder({ data: null, error: null });
    const fundsQuery = createQueryBuilder({ data: { invested_amount: 1000, current_value: 1100 }, error: null });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          investment_contributions: contributionsQuery,
          investment_funds: fundsQuery,
        },
      }),
    );

    const result = await deleteContribution("contrib-2", FUND_ID, 200);

    expect(result).toEqual({ success: true });
    expect(contributionsQuery.delete).toHaveBeenCalled();
    expect(fundsQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        invested_amount: 800,
        current_value: 900,
      }),
    );
  });

  it("builds grouped investment summary", async () => {
    const accountsQuery = createQueryBuilder({ data: { has_investments: true }, error: null });
    const fundsQuery = createQueryBuilder({
      data: [
        { id: "f1", invested_amount: 1000, current_value: 1200, investment_type: { name: "ETF" } },
        { id: "f2", invested_amount: 500, current_value: 450, investment_type: { name: "ETF" } },
        { id: "f3", invested_amount: 300, current_value: 350, investment_type: { name: "Crypto" } },
      ],
      error: null,
    });

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          accounts: accountsQuery,
          investment_funds: fundsQuery,
        },
      }),
    );

    const summary = await getInvestmentSummary();

    expect(summary?.totalInvested).toBe(1800);
    expect(summary?.totalValue).toBe(2000);
    expect(summary?.totalReturn).toBe(200);
    expect(summary?.types).toHaveLength(2);
  });
});
