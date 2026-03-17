"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ACCOUNT_COOKIE = "iglu_account_id";

export async function getAccounts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return [];
  return data;
}

export async function getSelectedAccountId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCOUNT_COOKIE)?.value ?? null;
}

export async function selectAccount(accountId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_COOKIE, accountId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
  redirect("/dashboard");
}
