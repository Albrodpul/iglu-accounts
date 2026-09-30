import { defineConfig } from "@playwright/test";
import { AUTH_STATE_PATH } from "./e2e/auth-state";

/**
 * End-to-end checks at phone and desktop widths against the local dev server.
 *
 * The dev server talks to the real Supabase project, so every spec is
 * READ-ONLY: navigate, open and close dialogs, assert layout — never submit a
 * form or delete anything.
 *
 * Auth: run `npm run e2e:login` once and sign in by hand in the window that
 * opens; the session is saved to e2e/.auth/ (gitignored) and reused here.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  // `next dev` compiles each route on its first hit, which can take well over
  // the 30s default when several specs cold-start routes in parallel.
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3002",
    // Use the installed Google Chrome — no separate browser download needed.
    channel: "chrome",
    storageState: AUTH_STATE_PATH,
    trace: "retain-on-failure",
    navigationTimeout: 60_000,
  },
  projects: [
    // Refreshes and re-saves the session before the specs (see auth.setup.ts).
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3002/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
