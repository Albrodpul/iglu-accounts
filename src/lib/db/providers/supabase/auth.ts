import { createClient } from "@/lib/supabase/server";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function authSignIn(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function authSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function authUpdateUser(data: { data: Record<string, unknown> }) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(data);
  return { error };
}
