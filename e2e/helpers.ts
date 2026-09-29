import { expect, test, type Page } from "@playwright/test";

/**
 * Navigate to an authenticated page. Skips (instead of failing) when there is
 * no usable session, pointing at the one-time login script.
 */
export async function gotoAuthed(page: Page, pathname: string) {
  await page.goto(pathname);
  const current = new URL(page.url()).pathname;
  if (current.startsWith("/login") || current.startsWith("/select-account")) {
    test.skip(true, "Sin sesión: ejecuta `npm run e2e:login` e inicia sesión una vez.");
  }
}

/** Fails if the page can be scrolled sideways — the classic responsive bug. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow, "la página no debe tener scroll horizontal").toBeLessThanOrEqual(0);
}
