import { test, expect } from "@playwright/test";

/**
 * Smoke E2E — unauthenticated flows that don't need seeded data. Run against
 * a built app: `npm run build && npm start`, then `npx playwright test`.
 * Full authenticated journeys (signup → design → export → subscribe) are run
 * manually per docs/TESTING.md against a live Supabase + Paddle sandbox.
 */

test("landing page loads with primary CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DentBrand AI" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});

test("health check returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe("ok");
});

test("protected route redirects unauthenticated users to login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("legal pages are reachable", async ({ page }) => {
  for (const path of ["/privacy", "/terms", "/refund-policy"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("login page renders the form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
