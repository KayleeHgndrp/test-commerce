import path from "node:path";
import { defineConfig } from "vitest/config";

// Automatic checks for the flows that bring in money. They run on every pull
// request (see .github/workflows/tests.yml) and locally with `npm test`.
// Stripe, Brevo and the mail server are replaced by fakes, so a test run never
// charges a card or sends a real email.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/helpers/setup.ts"],
    testTimeout: 30000,
  },
});
