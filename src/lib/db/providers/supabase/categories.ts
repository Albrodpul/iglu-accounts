import type { SupabaseClient } from "@supabase/supabase-js";

type CategoryInsert = {
  name: string;
  icon?: string | null;
  color?: string | null;
  sort_order: number;
  account_id: string;
};

export function createCategoriesRepo(client: SupabaseClient) {
  return {
    async findAll(accountId: string | null) {
      let q = client
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async findWithDetails(accountId: string | null) {
      let q = client.from("categories").select("id, name, icon, color");
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      return data ?? [];
    },

    async findByNameIlike(accountId: string, name: string) {
      const { data } = await client
        .from("categories")
        .select("id")
        .eq("account_id", accountId)
        .ilike("name", name)
        .limit(1);
      return data && data.length > 0 ? data[0] : null;
    },

    async findByNamesIn(accountId: string, names: string[]) {
      const { data } = await client
        .from("categories")
        .select("id, name")
        .eq("account_id", accountId)
        .in("name", names);
      return data ?? [];
    },

    async create(data: CategoryInsert) {
      const { data: created, error } = await client
        .from("categories")
        .insert(data)
        .select("id")
        .single();
      return { data: created, error: error?.message ?? null };
    },

    async update(id: string, accountId: string, data: Record<string, unknown>) {
      const { error } = await client
        .from("categories")
        .update(data)
        .eq("id", id)
        .eq("account_id", accountId);
      return { error: error?.message ?? null };
    },

    async delete(id: string, accountId: string) {
      const { error } = await client
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("account_id", accountId);
      return { error: error?.message ?? null };
    },
  };
}

export type CategoriesRepo = ReturnType<typeof createCategoriesRepo>;
