import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke config. Requires a running app (`npm run build && npm start`)
 * with valid Supabase env; run with `npx playwright test`. Not part of the
 * default `npm test` (which is the fast Vitest unit suite).
 *
 * Chromium is pre-installed in the managed environment at /opt/pw-browsers.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
