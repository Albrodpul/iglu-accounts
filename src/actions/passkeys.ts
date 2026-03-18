"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UserPasskey = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
};

export async function getUserPasskeys(): Promise<UserPasskey[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_passkeys")
    .select("id, label, created_at, last_used_at")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function deleteUserPasskey(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("user_passkeys")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
