import { expect, test, type Page } from '@playwright/test';

/**
 * Happy path del editor (§12.1, F3): elegir modelo → elegir funda →
 * personalizar → añadir un elemento → el precio sube → deshacer lo revierte.
 */

async function totalPrice(page: Page): Promise<string> {
  const label = await page
    .getByRole('button', { name: /Ver desglose del precio/ })
    .getAttribute('aria-label');
  return label ?? '';
}

test('flujo modelo → funda → editor → añadir elemento', async ({ page }) => {
  // 1. Selección de modelo (§5.3)
  await page.goto('/modelo');
  await expect(page.getByRole('heading', { name: /Qué iPhone tienes/ })).toBeVisible();
  await page.getByRole('button', { name: /iPhone 15$/ }).first().click();
  await page.getByRole('button', { name: 'iPhone 15 Pro', exact: true }).click();

  // 2. Catálogo de fundas (§5.4), solo compatibles
  await page.waitForURL('**/fundas');
  await page.getByRole('link', { name: /Silicona Soft/ }).first().click();

  // 3. Ficha (§5.5) → personalizar
  await page.waitForURL('**/fundas/silicona-soft');
  await page.getByRole('button', { name: /Personalizar esta funda/ }).click();

  // 4. Editor (§6): visor listo con precio base
  await page.waitForURL('**/editor**');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /Ver desglose del precio/ })).toBeVisible();
  const before = await totalPrice(page);

  // 5. Añadir un corazón desde el panel (tap = centro libre, §6.4)
  await page.getByRole('tab', { name: 'Corazones' }).click();
  await page.getByRole('button', { name: /Corazón rosa/ }).click();

  // 6. El precio en tiempo real sube (§6.7)
  await expect(async () => {
    expect(await totalPrice(page)).not.toBe(before);
  }).toPass({ timeout: 5_000 });

  // 7. Deshacer lo revierte (§6.8)
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(async () => {
    expect(await totalPrice(page)).toBe(before);
  }).toPass({ timeout: 5_000 });
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled();
});
