import { defineConfig, devices } from "@playwright/test";

// Browser checks: a real (headless) browser fills in a test on the site running
// locally and walks to the buy button. Payments and Brevo are intercepted, so
// nothing is charged or sent. Run with `npm run test:e2e`.
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "off", ...devices["Pixel 7"] },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    // A placeholder key makes the result page show the email box, as on the live
    // site. The browser test intercepts the sign-up, so Brevo is never called.
    env: { BREVO_API_KEY: "e2e-placeholder", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
