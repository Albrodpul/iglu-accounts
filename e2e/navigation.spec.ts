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
    const sheet = page.getByRole("dialog", { name: "Menú" });
    await expect(sheet.getByRole("link", { name: "Resumen" })).toBeVisible();
  } else {
    await expect(bottomNav.getByRole("link", { name: "Resumen" })).toBeVisible();
  }
});

test("móvil: un solo menú, a la altura de su contenido, con todo lo que no está en la barra", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await gotoAuthed(page, "/dashboard");

  // The header hamburger is gone: "Más" is the only menu.
  await expect(page.getByRole("button", { name: "Menú", exact: true })).toHaveCount(0);

  await page.locator("nav.mobile-nav").getByRole("button", { name: "Más" }).click();
  const sheet = page.getByRole("dialog", { name: "Menú" });
  for (const name of ["Movimientos fijos", "Ajustes"]) {
    await expect(sheet.getByRole("link", { name })).toBeVisible();
  }
  // The backup moved to Ajustes: the menu is navigation and two switches.
  await expect(sheet.getByRole("link", { name: "Importar" })).toHaveCount(0);
  await expect(sheet.getByRole("switch", { name: "Ocultar importes" })).toBeVisible();
  await expect(sheet.getByRole("switch", { name: "Tema oscuro" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();

  const box = await sheet.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.height).toBeLessThan(viewport.height * 0.8);
});

test("escritorio: sin barra inferior", async ({ page, isMobile }) => {
  test.skip(isMobile, "solo escritorio");
  await gotoAuthed(page, "/dashboard");
  await expect(page.locator("nav.mobile-nav")).toBeHidden();
});
