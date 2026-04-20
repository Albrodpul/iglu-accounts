import type { SupabaseClient } from "@supabase/supabase-js";

export function createUserPreferencesRepo(client: SupabaseClient) {
  return {
    async get(userId: string) {
      const { data } = await client
        .from("user_preferences")
        .select("discrete_mode")
        .eq("user_id", userId)
        .single();
      return data ?? null;
    },

    async upsert(userId: string, prefs: { discrete_mode: boolean }) {
      const { error } = await client
        .from("user_preferences")
        .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() });
      return { error: error?.message ?? null };
    },
  };
}
