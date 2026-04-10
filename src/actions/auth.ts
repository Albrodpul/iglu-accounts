"use server";

import { authSignIn, authSignOut } from "@/lib/db/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function translateSignInError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Debes confirmar tu email antes de iniciar sesión.";
  }

  if (normalized.includes("too many requests")) {
    return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
  }

  return message;
}

export async function signIn(formData: FormData) {
  const { error } = await authSignIn(
    formData.get("email") as string,
    formData.get("password") as string,
  );

  if (error) {
    return { error: translateSignInError(error.message) };
  }

  redirect("/select-account");
}

export async function signOut() {
  await authSignOut();
  const cookieStore = await cookies();
  cookieStore.delete("iglu_account_id");
  redirect("/login");
}
