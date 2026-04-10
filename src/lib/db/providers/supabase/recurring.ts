import type { SupabaseClient } from "@supabase/supabase-js";

type RecurringInsert = {
  user_id: string;
  account_id?: string | null;
  category_id?: string | null;
  amount: number;
  concept?: string | null;
  day_of_month?: number | null;
  schedule_type: string;
  is_active?: boolean;
};

export function createRecurringRepo(client: SupabaseClient) {
  return {
    async findActive(accountId: string | null) {
      let q = client
        .from("recurring_expenses")
        .select("*, category:categories(*)")
        .eq("is_active", true)
        .order("concept", { ascending: true });
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async findActiveMinimal(accountId: string | null) {
      let q = client
        .from("recurring_expenses")
        .select("id, amount, schedule_type, day_of_month, created_at")
        .eq("is_active", true);
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      return data ?? [];
    },

    async findActiveForUser(userId: string, accountId: string | null) {
      let q = client
        .from("recurring_expenses")
        .select("*")
        .eq("is_active", true)
        .eq("user_id", userId);
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) return null;
      return data;
    },

    async findAllActive() {
      const { data, error } = await client
        .from("recurring_expenses")
        .select("*")
        .eq("is_active", true);
      if (error) return null;
      return data;
    },

    async findForDedup(accountId: string) {
      const { data } = await client
        .from("recurring_expenses")
        .select("day_of_month, concept, amount")
        .eq("account_id", accountId);
      return data ?? [];
    },

    async findForBackup(accountId: string) {
      const { data, error } = await client
        .from("recurring_expenses")
        .select("id, category_id, amount, concept, day_of_month, schedule_type, is_active")
        .eq("account_id", accountId)
        .order("created_at", { ascending: true });
      if (error) return null;
      return data;
    },

    async create(data: RecurringInsert) {
      const { error } = await client.from("recurring_expenses").insert(data);
      return { error: error?.message ?? null };
    },

    async createMany(data: RecurringInsert[]) {
      const { error } = await client.from("recurring_expenses").insert(data);
      return { error: error?.message ?? null };
    },

    async update(id: string, userId: string, data: Record<string, unknown>) {
      const { error } = await client
        .from("recurring_expenses")
        .update(data)
        .eq("id", id)
        .eq("user_id", userId);
      return { error: error?.message ?? null };
    },

    async deactivate(id: string, userId: string) {
      const { error } = await client
        .from("recurring_expenses")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);
      return { error: error?.message ?? null };
    },
  };
}

export type RecurringRepo = ReturnType<typeof createRecurringRepo>;
