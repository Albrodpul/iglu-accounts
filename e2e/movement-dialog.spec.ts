import { expect, test } from "@playwright/test";
import { gotoAuthed } from "./helpers";

// Opens and closes the dialog only — never submits (real data).

test("móvil: «Nuevo movimiento» es un bottom sheet alto con botones táctiles", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await gotoAuthed(page, "/dashboard");

  await page.locator("nav.mobile-nav").getByRole("button", { name: "Nuevo movimiento" }).click();
  const sheet = page.getByRole("dialog", { name: "Nuevo movimiento" });
  await expect(sheet).toBeVisible();

  const viewport = page.viewportSize()!;
  // Wait for the slide-in animation to settle before measuring.
  await expect
    .poll(async () => {
      const b = (await sheet.boundingBox())!;
      return Math.round(b.y + b.height);
    })
    .toBe(viewport.height); // anchored to the bottom
  const box = (await sheet.boundingBox())!;
  expect(box.height).toBeGreaterThan(viewport.height * 0.9); // fixed ~94dvh height

  const submit = sheet.getByRole("button", { name: "Añadir gasto" });
  expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(44); // touch target

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});

test("escritorio: «Nuevo movimiento» es un diálogo centrado", async ({ page, isMobile }) => {
  test.skip(isMobile, "solo escritorio");
  await gotoAuthed(page, "/dashboard");

  await page.keyboard.press("n"); // global shortcut
  const dialog = page.getByRole("dialog", { name: "Nuevo movimiento" });
  await expect(dialog).toBeVisible();

  const viewport = page.viewportSize()!;
  const box = (await dialog.boundingBox())!;
  expect(box.y).toBeGreaterThan(0);
  expect(box.y + box.height).toBeLessThan(viewport.height);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
