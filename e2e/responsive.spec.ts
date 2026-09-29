import { test } from "@playwright/test";
import { expectNoHorizontalOverflow, gotoAuthed } from "./helpers";

const PAGES = ["/dashboard", "/expenses", "/summary", "/investments", "/settings"];

for (const pathname of PAGES) {
  test(`${pathname} no tiene scroll horizontal`, async ({ page }) => {
    await gotoAuthed(page, pathname);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page);
  });
}
