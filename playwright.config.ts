import { defineConfig } from '@playwright/test';

/**
 * E2E del happy path del editor (§12.1). Requiere el servidor levantado con
 * BD sembrada: `npm run build && npm start` (o `npm run dev`) y `db:seed`.
 * URL configurable con E2E_BASE_URL.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    viewport: { width: 390, height: 844 }, // mobile-first
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
});
