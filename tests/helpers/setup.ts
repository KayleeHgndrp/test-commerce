import { afterEach, beforeEach, vi } from "vitest";
import { installFakeApis, mailbox } from "./fakes";

// Mail never leaves the test run: every message lands in the fake mailbox.
vi.mock("@/lib/email", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...real,
    sendEmail: vi.fn(async (to: string, message: Parameters<typeof real.sendEmail>[1]) => {
      if (mailbox.failNext) {
        mailbox.failNext = false;
        throw new Error("SMTP down");
      }
      mailbox.sent.push({ to, ...message });
    }),
  };
});

// Every test starts from a clean, offline world: fake Stripe and Brevo, an empty
// mailbox, and no real keys. A test that needs a key sets it itself.
beforeEach(() => {
  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "BREVO_API_KEY", "BREVO_SENDER_EMAIL", "BREVO_LIST_ID", "SMTP_HOST", "PARTNER_SECRET", "ADMIN_TOKEN", "CRON_SECRET", "ERROR_WEBHOOK_URL", "STRIPE_AUTOMATIC_TAX"]) {
    vi.stubEnv(key, "");
  }
  installFakeApis();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
