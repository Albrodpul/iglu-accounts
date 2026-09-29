// One-time sign-in for the E2E suite.
//
// Opens a real Chrome window on /login. YOU sign in (password or passkey) and
// pick the account; nothing here types credentials. Once the app is past both
// /login and /select-account (which sets the account cookie) the session is
// saved to e2e/.auth/state.json (gitignored) and reused by `npm run e2e`
// until it expires — then run this again.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const statePath = path.join(root, "e2e", ".auth", "state.json");
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3002";

try {
  await fetch(`${baseURL}/login`);
} catch {
  console.error(`No hay servidor en ${baseURL}. Arranca \`npm run dev\` y vuelve a lanzar este script.`);
  process.exit(1);
}

const browser = await chromium.launch({ channel: "chrome", headless: false });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${baseURL}/login`);
console.log("Inicia sesión y elige la cuenta en la ventana de Chrome (tienes 5 minutos)...");

const inAuthFlow = (url) => url.pathname.startsWith("/login") || url.pathname.startsWith("/select-account");
await page.waitForURL((url) => !inAuthFlow(url), { timeout: 5 * 60_000 });

fs.mkdirSync(path.dirname(statePath), { recursive: true });
await context.storageState({ path: statePath });
console.log(`Sesión guardada en ${path.relative(root, statePath)}`);

await browser.close();
