import type { SupabaseClient } from "@supabase/supabase-js";

export function createAccountsRepo(client: SupabaseClient) {
  return {
    async findAll() {
      const { data, error } = await client
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) return [];
      return data ?? [];
    },

    async findSettings(id: string) {
      const { data, error } = await client
        .from("accounts")
        .select("id, has_investments")
        .eq("id", id)
        .single();
      if (error) return null;
      return data;
    },

    async findById(id: string) {
      const { data, error } = await client
        .from("accounts")
        .select("id, name, has_investments")
        .eq("id", id)
        .single();
      if (error) return null;
      return data;
    },

    async findForNotifications(id: string) {
      const { data } = await client
        .from("accounts")
        .select("notifications_enabled, name")
        .eq("id", id)
        .single();
      return data ?? null;
    },

    async findWithNotificationsEnabled() {
      const { data } = await client
        .from("accounts")
        .select("id, name, notifications_enabled")
        .eq("notifications_enabled", true);
      return data ?? [];
    },

    async update(id: string, data: Record<string, unknown>) {
      const { error } = await client.from("accounts").update(data).eq("id", id);
      return { error: error?.message ?? null };
    },

    async create(name: string) {
      const { data, error } = await client
        .from("accounts")
        .insert({ name })
        .select("id")
        .single();
      return { data, error: error?.message ?? null };
    },

    async delete(id: string) {
      const { error } = await client.from("accounts").delete().eq("id", id);
      return { error: error?.message ?? null };
    },

    async getMembership(accountId: string, userId: string) {
      const { data } = await client
        .from("account_members")
        .select("role")
        .eq("account_id", accountId)
        .eq("user_id", userId)
        .single();
      return data ?? null;
    },

    async createMember(accountId: string, userId: string, role: string) {
      const { error } = await client
        .from("account_members")
        .insert({ account_id: accountId, user_id: userId, role });
      return { error: error?.message ?? null };
    },

    async isMember(accountId: string, userId: string) {
      const { data } = await client
        .from("account_members")
        .select("id")
        .eq("account_id", accountId)
        .eq("user_id", userId)
        .limit(1);
      return !!(data && data.length > 0);
    },

    async getMemberUserIds(accountId: string) {
      const { data } = await client
        .from("account_members")
        .select("user_id")
        .eq("account_id", accountId);
      return (data ?? []).map((m: { user_id: string }) => m.user_id);
    },

    async getDataCounts(accountId: string) {
      const [expenses, recurring, categories, investments] = await Promise.all([
        client.from("expenses").select("id", { count: "exact", head: true }).eq("account_id", accountId),
        client.from("recurring_expenses").select("id", { count: "exact", head: true }).eq("account_id", accountId),
        client.from("categories").select("id", { count: "exact", head: true }).eq("account_id", accountId),
        client.from("investment_funds").select("id", { count: "exact", head: true }).eq("account_id", accountId),
      ]);
      return {
        expenses: expenses.count ?? 0,
        recurring: recurring.count ?? 0,
        categories: categories.count ?? 0,
        investments: investments.count ?? 0,
      };
    },
  };
}

export type AccountsRepo = ReturnType<typeof createAccountsRepo>;
