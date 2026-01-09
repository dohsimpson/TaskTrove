import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PORT ?? 5000)
const isHeaded = process.env.PW_HEADED === "1" || process.env.PW_HEADED === "true"
const slowMo = process.env.PW_SLOWMO ? Number(process.env.PW_SLOWMO) : undefined

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      headless: !isHeaded,
      ...(slowMo ? { slowMo } : {}),
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      PORT: String(PORT),
      AUTH_SECRET: "playwright-secret",
      NEXTAUTH_URL: `http://127.0.0.1:${PORT}`,
    },
  },
})
