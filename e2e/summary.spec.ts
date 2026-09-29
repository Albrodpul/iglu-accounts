import { expect, test } from "@playwright/test";
import { gotoAuthed } from "./helpers";

test("móvil: desplegable de vistas y tabla anual transpuesta (meses en filas)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await gotoAuthed(page, "/summary");

  const selector = page.getByLabel("Vista del resumen");
  await expect(selector).toBeVisible();
  await expect(page.getByRole("tablist")).toBeHidden();

  await selector.selectOption({ label: "Tabla por categoría y mes" });
  await expect(page.getByRole("columnheader", { name: "Mes" })).toBeVisible();
});

test("escritorio: pestañas y tabla anual con categorías en filas", async ({ page, isMobile }) => {
  test.skip(isMobile, "solo escritorio");
  await gotoAuthed(page, "/summary");

  await expect(page.getByLabel("Vista del resumen")).toBeHidden();
  await page.getByRole("tab", { name: "Categoría × mes" }).click();
  await expect(page.getByRole("columnheader", { name: "Categoría" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Mes" })).toBeHidden();
});
