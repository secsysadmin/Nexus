import { defineConfig } from "@playwright/test";
const external = process.env.NEXUS_TEST_BASE_URL;
export default defineConfig({
  testDir: "./tests",
  testMatch: "browser.spec.ts",
  workers: 1,
  expect: { timeout: 15000 },
  timeout: 90000,
  use: {
    baseURL: external ?? "http://localhost:3100",
    headless: true,
    actionTimeout: 15000,
    trace: "retain-on-failure",
  },
  webServer: external
    ? undefined
    : {
        command: "npm run dev -- --port 3100",
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
});
