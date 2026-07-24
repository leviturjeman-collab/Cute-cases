import { expect, test } from '@playwright/test';

/**
 * E1 (anexo v4.3): matriz de encuadre. Para {13 mini, 15 Pro, 17 Pro Max} x
 * {360x640, 390x844, 844x390, 1280x800}, la camara del editor queda a la
 * distancia de encaje y la funda entra completa en el area util con >= 4% de
 * aire perimetral. Se verifica con el hook de depuracion __ccFit (solo dev).
 */

const DEVICES = ['iphone-13-mini', 'iphone-15-pro', 'iphone-17-pro-max'];
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 844, height: 390 }, // landscape
  { width: 1280, height: 800 },
];

interface FitHook {
  dFit: number;
  fitTy: number;
  size: { width: number; height: number };
  device: { anchoMm: number; altoMm: number };
  occlusions: { topPx: number; bottomPx: number };
  camera: { distance: number; targetY: number; azimuthDeg: number; polarDeg: number } | null;
}

for (const slug of DEVICES) {
  for (const vp of VIEWPORTS) {
    test(`encuadre ${slug} @ ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      // Preparar cc.device + variante por API real
      await page.goto('/');
      const setup = await page.evaluate(async (deviceSlug) => {
        const devicesRes = await (await fetch('/api/devices')).json();
        const all = devicesRes.generaciones.flatMap(
          (g: { modelos: { id: string; slug: string; nombre: string }[] }) => g.modelos,
        );
        const device = all.find((d: { slug: string }) => d.slug === deviceSlug);
        if (!device) return null;
        const casesRes = await (await fetch(`/api/cases?deviceId=${device.id}`)).json();
        const funda = casesRes.fundas[0];
        const variant = funda?.variantes.find((v: { disponible: boolean }) => v.disponible);
        if (!variant) return null;
        window.localStorage.setItem(
          'cc.device',
          JSON.stringify({ id: device.id, nombre: device.nombre }),
        );
        window.localStorage.removeItem('cc.draft');
        window.localStorage.setItem('cc.hints.tour', '1');
        window.localStorage.setItem('cc.hints.orbit', '1');
        return { variantId: variant.id };
      }, slug);
      expect(setup).not.toBeNull();

      await page.goto(`/editor?variant=${setup!.variantId}`);
      await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 });
      // Esperar al primer encuadre del rig
      await page.waitForFunction(
        () => {
          const fit = (window as unknown as { __ccFit?: { getCamera: () => unknown } }).__ccFit;
          return Boolean(fit && fit.getCamera());
        },
        undefined,
        { timeout: 30_000 },
      );
      await page.waitForTimeout(600); // asentar animaciones

      const fit = await page.evaluate<FitHook>(() => {
        const f = (
          window as unknown as {
            __ccFit: Omit<FitHook, 'camera'> & { getCamera: () => FitHook['camera'] };
          }
        ).__ccFit;
        return {
          dFit: f.dFit,
          fitTy: f.fitTy,
          size: f.size,
          device: f.device,
          occlusions: f.occlusions,
          camera: f.getCamera(),
        };
      });

      expect(fit.camera).not.toBeNull();
      // La camara descansa a la distancia de encaje (E1.3: max = dFit)
      expect(fit.camera!.distance).toBeGreaterThan(fit.dFit * 0.97);
      expect(fit.camera!.distance).toBeLessThan(fit.dFit * 1.03);
      // Target desplazado al centro del area util
      expect(Math.abs(fit.camera!.targetY - fit.fitTy)).toBeLessThan(Math.abs(fit.fitTy) * 0.1 + 1);

      // La caja de la funda entra completa con >= 4% de aire en el area util
      const halfTan = Math.tan((16 * Math.PI) / 180);
      const usableH = Math.max(1, fit.size.height - fit.occlusions.topPx - fit.occlusions.bottomPx);
      const visibleH = 2 * fit.camera!.distance * halfTan * (usableH / fit.size.height);
      const visibleW = 2 * fit.camera!.distance * halfTan * (fit.size.width / fit.size.height);
      expect(visibleH).toBeGreaterThanOrEqual(fit.device.altoMm * 1.04);
      expect(visibleW).toBeGreaterThanOrEqual(fit.device.anchoMm * 1.04);
    });
  }
}

test('el reencuadre reacciona al cambio de area util (sheet)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const setup = await page.evaluate(async () => {
    const devicesRes = await (await fetch('/api/devices')).json();
    const all = devicesRes.generaciones.flatMap(
      (g: { modelos: { id: string; slug: string; nombre: string }[] }) => g.modelos,
    );
    const device = all.find((d: { slug: string }) => d.slug === 'iphone-15-pro');
    const casesRes = await (await fetch(`/api/cases?deviceId=${device.id}`)).json();
    const variant = casesRes.fundas[0].variantes.find((v: { disponible: boolean }) => v.disponible);
    window.localStorage.setItem('cc.device', JSON.stringify({ id: device.id, nombre: device.nombre }));
    window.localStorage.removeItem('cc.draft');
    window.localStorage.setItem('cc.hints.tour', '1');
    window.localStorage.setItem('cc.hints.orbit', '1');
    return { variantId: variant.id };
  });
  await page.goto(`/editor?variant=${setup.variantId}`);
  await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => (window as unknown as { __ccFit: { dFit: number } }).__ccFit.dFit);

  // Cambiar el viewport simula el cambio de area util (canvas mas bajo)
  await page.setViewportSize({ width: 390, height: 600 });
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => (window as unknown as { __ccFit: { dFit: number } }).__ccFit.dFit);
  expect(after).toBeGreaterThan(before);
  const camera = await page.evaluate(
    () => (window as unknown as { __ccFit: { getCamera: () => { distance: number } } }).__ccFit.getCamera(),
  );
  // La camara viaja a la nueva distancia de encaje (reencuadre reactivo)
  expect(camera.distance).toBeGreaterThan(after * 0.9);
});
