"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";

export type UserPasskey = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
};

export async function getUserPasskeys(): Promise<UserPasskey[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const db = await getDb();
  return db.passkeys.findByUser(user.id);
}

export async function deleteUserPasskey(id: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const { error } = await db.passkeys.delete(id, user.id);

  if (error) return { error };

  revalidatePath("/settings");
  return { success: true };
}
