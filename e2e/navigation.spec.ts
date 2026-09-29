import { expect, test } from "@playwright/test";
import { gotoAuthed } from "./helpers";

test("móvil: barra inferior visible; con inversiones, Resumen vive en «Más»", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await gotoAuthed(page, "/dashboard");

  const bottomNav = page.locator("nav.mobile-nav");
  await expect(bottomNav).toBeVisible();

  const investmentsInBar = await bottomNav.getByRole("link", { name: "Inversiones" }).count();
  if (investmentsInBar > 0) {
    await expect(bottomNav.getByRole("link", { name: "Resumen" })).toHaveCount(0);
    await bottomNav.getByRole("button", { name: "Más" }).click();
    const sheet = page.getByRole("dialog", { name: "Más opciones" });
    await expect(sheet.getByRole("link", { name: "Resumen" })).toBeVisible();
  } else {
    await expect(bottomNav.getByRole("link", { name: "Resumen" })).toBeVisible();
  }
});

test("escritorio: sin barra inferior", async ({ page, isMobile }) => {
  test.skip(isMobile, "solo escritorio");
  await gotoAuthed(page, "/dashboard");
  await expect(page.locator("nav.mobile-nav")).toBeHidden();
});
