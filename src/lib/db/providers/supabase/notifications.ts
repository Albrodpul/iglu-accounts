import type { SupabaseClient } from "@supabase/supabase-js";

export function createNotificationsRepo(client: SupabaseClient) {
  return {
    async upsert(data: {
      user_id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }) {
      const { error } = await client
        .from("push_subscriptions")
        .upsert(data, { onConflict: "user_id,endpoint" });
      return { error: error?.message ?? null };
    },

    async findByUser(userId: string) {
      const { data, error } = await client
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);
      if (error) return null;
      return data;
    },

    async findByUsers(userIds: string[]) {
      const { data } = await client
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .in("user_id", userIds);
      return data ?? [];
    },

    async deleteByEndpoints(endpoints: string[]) {
      await client.from("push_subscriptions").delete().in("endpoint", endpoints);
    },

    async delete(userId: string, endpoint: string) {
      const { error } = await client
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);
      return { error: error?.message ?? null };
    },
  };
}

export type NotificationsRepo = ReturnType<typeof createNotificationsRepo>;
