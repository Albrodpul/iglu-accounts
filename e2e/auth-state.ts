import fs from "node:fs";
import path from "node:path";

/** Saved browser session (cookies incl. httpOnly). Holds credentials: gitignored. */
export const AUTH_STATE_PATH = path.join(__dirname, ".auth", "state.json");

// Playwright refuses a missing storageState file, so start from an empty one;
// specs then skip with a hint instead of crashing.
if (!fs.existsSync(AUTH_STATE_PATH)) {
  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }));
}
