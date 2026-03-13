import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests for the React/Vite frontend.
 * - Frontend is started automatically via webServer (or set BASE_URL to use existing).
 * - API must be running on port 3000 (e.g. pnpm dev:api from root) with menu seeded.
 * Run: pnpm run test:e2e (from apps/frontend) or pnpm --filter frontend run test:e2e from root.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "pnpm exec vite",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
