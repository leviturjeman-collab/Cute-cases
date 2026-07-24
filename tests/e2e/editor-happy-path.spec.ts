import { expect, test, type Page } from '@playwright/test';

/**
 * Happy path E2E (SS24.3): modelo -> funda -> ficha -> editor -> anadir
 * elemento -> precio sube -> deshacer revierte. Requiere servidor con BD
 * sembrada (npm run db:seed).
 */

async function totalPrice(page: Page): Promise<string> {
  const label = await page
    .getByRole('button', { name: /Ver desglose del precio/ })
    .getAttribute('aria-label');
  return label ?? '';
}

test('flujo modelo -> funda -> editor -> anadir elemento', async ({ page }) => {
  // 1. Seleccion de modelo (SS6.2): acordeon por generacion, 17 abierta
  await page.goto('/modelo');
  await expect(page.getByRole('heading', { name: 'Selecciona tu iPhone' })).toBeVisible();
  await page.getByRole('button', { name: 'iPhone 15', exact: true }).click();
  await page.getByRole('button', { name: /^iPhone 15 Pro/, exact: false }).first().click();

  // 2. Catalogo de fundas (SS6.3): solo compatibles con el modelo
  await page.waitForURL('**/fundas');
  await expect(page.getByRole('heading', { name: /fundas para iPhone 15 Pro/ })).toBeVisible();
  await page.getByRole('link', { name: /Silicona Soft/ }).first().click();

  // 3. Ficha (SS6.4) -> personalizar
  await page.waitForURL('**/fundas/silicona-soft');
  await page.getByRole('button', { name: 'Personalizar esta funda' }).click();

  // 4. Editor (SS7): visor listo con precio base en tiempo real
  await page.waitForURL('**/editor**');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: /Ver desglose del precio/ })).toBeVisible({
    timeout: 30_000,
  });
  const before = await totalPrice(page);

  // 5. Anadir un corazon desde el panel (tap = colocacion automatica, SS7.5)
  await page.getByRole('tab', { name: 'Corazones' }).click();
  await page.getByRole('button', { name: /Corazon clasico/ }).click();

  // 6. El precio sube (SS7.9)
  await expect
    .poll(async () => totalPrice(page), { timeout: 10_000 })
    .not.toBe(before);

  // 7. Deshacer revierte precio (SS7.2, historial)
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect.poll(async () => totalPrice(page), { timeout: 10_000 }).toBe(before);
});

test('paginas publicas cargan con contenido del seed (D4)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Diseños de la casa' })).toBeVisible();

  await page.goto('/disenos');
  await expect(page.getByRole('link', { name: /Coquette/ }).first()).toBeVisible();

  await page.goto('/galeria');
  await expect(page.getByRole('heading', { name: 'Galería', exact: true })).toBeVisible();

  await page.goto('/cesta');
  await expect(page.getByRole('heading', { name: 'Cesta' })).toBeVisible();
});
