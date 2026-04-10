import type { SupabaseClient } from "@supabase/supabase-js";

export function createPasskeysRepo(client: SupabaseClient) {
  return {
    async findByUser(userId: string) {
      const { data, error } = await client
        .from("user_passkeys")
        .select("id, label, created_at, last_used_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },

    async findByCredentialId(credentialId: string) {
      const { data, error } = await client
        .from("user_passkeys")
        .select("user_id, credential_id, public_key, counter, transports")
        .eq("credential_id", credentialId)
        .maybeSingle();
      if (error) return null;
      return data;
    },

    async create(data: {
      user_id: string;
      credential_id: string;
      public_key: string;
      counter: number;
      transports: string[];
      label: string | null;
    }) {
      const { error } = await client.from("user_passkeys").insert(data);
      return { error: error?.message ?? null };
    },

    async updateCounter(credentialId: string, counter: number, lastUsedAt: string) {
      const { error } = await client
        .from("user_passkeys")
        .update({ counter, last_used_at: lastUsedAt })
        .eq("credential_id", credentialId);
      return { error: error?.message ?? null };
    },

    async findCredentialIdsByUser(userId: string) {
      const { data } = await client
        .from("user_passkeys")
        .select("credential_id")
        .eq("user_id", userId);
      return data ?? [];
    },

    async delete(id: string, userId: string) {
      const { error } = await client
        .from("user_passkeys")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      return { error: error?.message ?? null };
    },
  };
}

export type PasskeysRepo = ReturnType<typeof createPasskeysRepo>;
