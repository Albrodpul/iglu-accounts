import type { SupabaseClient } from "@supabase/supabase-js";

export function createInvestmentsRepo(client: SupabaseClient) {
  return {
    // ─── Types ───

    async findTypes(accountId: string) {
      const { data, error } = await client
        .from("investment_types")
        .select("*")
        .eq("account_id", accountId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },

    async findTypesForBackup(accountId: string) {
      const { data, error } = await client
        .from("investment_types")
        .select("id, name, sort_order")
        .eq("account_id", accountId)
        .order("sort_order", { ascending: true });
      if (error) return null;
      return data;
    },

    async findTypesByName(accountId: string) {
      const { data } = await client
        .from("investment_types")
        .select("id, name")
        .eq("account_id", accountId);
      return data ?? [];
    },

    async hasFundsForType(typeId: string, accountId: string) {
      const { data } = await client
        .from("investment_funds")
        .select("id")
        .eq("type_id", typeId)
        .eq("account_id", accountId)
        .limit(1);
      return !!(data && data.length > 0);
    },

    async createType(data: { name: string; account_id: string; sort_order?: number }) {
      const { error } = await client.from("investment_types").insert(data);
      return { error: error?.message ?? null };
    },

    async updateType(id: string, accountId: string, data: Record<string, unknown>) {
      const { error } = await client
        .from("investment_types")
        .update(data)
        .eq("id", id)
        .eq("account_id", accountId);
      return { error: error?.message ?? null };
    },

    async deleteType(id: string, accountId: string) {
      const { error } = await client
        .from("investment_types")
        .delete()
        .eq("id", id)
        .eq("account_id", accountId);
      return { error: error?.message ?? null };
    },

    // ─── Funds ───

    async findFunds(accountId: string) {
      const { data, error } = await client
        .from("investment_funds")
        .select("*, investment_type:investment_types(*)")
        .eq("account_id", accountId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },

    async findFundAmounts(fundId: string, accountId: string) {
      const { data } = await client
        .from("investment_funds")
        .select("invested_amount, current_value")
        .eq("id", fundId)
        .eq("account_id", accountId)
        .single();
      return data ?? null;
    },

    async findFundsByName(accountId: string) {
      const { data } = await client
        .from("investment_funds")
        .select("id, name")
        .eq("account_id", accountId);
      return data ?? [];
    },

    async findFundsForBackup(accountId: string) {
      const { data, error } = await client
        .from("investment_funds")
        .select("id, type_id, name, invested_amount, current_value, sort_order")
        .eq("account_id", accountId)
        .order("sort_order", { ascending: true });
      if (error) return null;
      return data;
    },

    async createFund(data: {
      name: string;
      type_id: string;
      invested_amount: number;
      current_value: number;
      account_id: string;
      sort_order?: number;
    }) {
      const { data: created, error } = await client
        .from("investment_funds")
        .insert(data)
        .select("id")
        .single();
      return { data: created, error: error?.message ?? null };
    },

    async updateFund(id: string, accountId: string, data: Record<string, unknown>) {
      const { error } = await client
        .from("investment_funds")
        .update(data)
        .eq("id", id)
        .eq("account_id", accountId);
      return { error: error?.message ?? null };
    },

    async deleteFund(id: string, accountId: string) {
      const { error } = await client
        .from("investment_funds")
        .delete()
        .eq("id", id)
        .eq("account_id", accountId);
      return { error: error?.message ?? null };
    },

    // ─── Contributions ───

    async findContributions(fundId: string, accountId: string) {
      const { data, error } = await client
        .from("investment_contributions")
        .select("*")
        .eq("fund_id", fundId)
        .eq("account_id", accountId)
        .order("contribution_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },

    async findContributionsForBackup(fundIds: string[]) {
      const { data, error } = await client
        .from("investment_contributions")
        .select("id, fund_id, amount, contribution_date, notes")
        .in("fund_id", fundIds)
        .order("contribution_date", { ascending: true });
      if (error) return null;
      return data;
    },

    async findContributionsForDedup(fundIds: string[]) {
      const { data } = await client
        .from("investment_contributions")
        .select("fund_id, amount, contribution_date")
        .in("fund_id", fundIds);
      return data ?? [];
    },

    async findContributionById(id: string, accountId: string) {
      const { data } = await client
        .from("investment_contributions")
        .select("amount, fund_id")
        .eq("id", id)
        .eq("account_id", accountId)
        .single();
      return data ?? null;
    },

    async createContribution(data: {
      fund_id: string;
      account_id: string;
      amount: number;
      contribution_date: string;
      notes?: string | null;
    }) {
      const { error } = await client.from("investment_contributions").insert(data);
      return { error: error?.message ?? null };
    },

    async createContributions(
      data: Array<{
        fund_id: string;
        account_id: string;
        amount: number;
        contribution_date: string;
        notes?: string | null;
      }>,
    ) {
      const { error } = await client.from("investment_contributions").insert(data);
      return { error: error?.message ?? null };
    },

    async updateContribution(id: string, accountId: string, data: Record<string, unknown>) {
      const { error } = await client
        .from("investment_contributions")
        .update(data)
        .eq("id", id)
        .eq("account_id", accountId);
      return { error: error?.message ?? null };
    },

    async deleteContribution(id: string, accountId: string) {
      const { error } = await client
        .from("investment_contributions")
        .delete()
        .eq("id", id)
        .eq("account_id", accountId);
      return { error: error?.message ?? null };
    },
  };
}

export type InvestmentsRepo = ReturnType<typeof createInvestmentsRepo>;
