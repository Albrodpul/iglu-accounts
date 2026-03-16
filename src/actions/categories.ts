"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("categories").insert({
    name: formData.get("name") as string,
    icon: (formData.get("icon") as string) || null,
    color: (formData.get("color") as string) || "#64748b",
    sort_order: parseInt((formData.get("sort_order") as string) || "99"),
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
