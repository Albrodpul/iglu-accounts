import { test as setup } from "@playwright/test";
import { AUTH_STATE_PATH } from "./auth-state";

/**
 * Runs before the suite. Supabase rotates the refresh token on every use, so a
 * saved session goes stale after the first refresh. Visiting the app once and
 * saving the (rotated) state back keeps the chain alive between runs, and the
 * specs then start with a fresh access token (no concurrent refreshes).
 */
setup("renueva la sesión guardada", async ({ page }) => {
  await page.goto("/dashboard");
  const path = new URL(page.url()).pathname;
  if (path.startsWith("/login") || path.startsWith("/select-account")) {
    setup.skip(true, "Sin sesión: ejecuta `npm run e2e:login` e inicia sesión una vez.");
  }
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
