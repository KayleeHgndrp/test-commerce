import { fromAddress, sendEmail } from "@/lib/email";
import { hasLocale, type Locale } from "@/lib/i18n/locales";
import { getDefinition } from "@/lib/i18n/messages";
import { renderReport } from "@/lib/report/render";
import { site } from "@/lib/site";
import { stripeRequest } from "@/lib/stripe";
import { decodeAnswers } from "@/lib/tests/scoring";

export type CheckoutSession = {
  id: string;
  payment_status: string;
  payment_intent: string | null;
  customer_email: string | null;
  customer_details?: { email?: string | null };
  metadata: Record<string, string>;
};

export type PaidOrder = { locale: Locale; slug: string; answers: number[]; email: string; session: CheckoutSession };

// Validates a Checkout Session and extracts the order it paid for.
export function paidOrder(session: CheckoutSession): PaidOrder | null {
  if (session.payment_status !== "paid") return null;
  const { slug, locale, answers } = session.metadata ?? {};
  const def = getDefinition(slug);
  const decoded = def ? decodeAnswers(def, answers) : null;
  const email = session.customer_details?.email ?? session.customer_email;
  if (!decoded || !hasLocale(locale) || !email) return null;
  return { locale, slug, answers: decoded, email, session };
}

export async function retrievePaidOrder(sessionId: string) {
  if (!process.env.STRIPE_SECRET_KEY || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  try {
    return paidOrder(await stripeRequest<CheckoutSession>(`checkout/sessions/${sessionId}`));
  } catch {
    return null;
  }
}

// Emails the report unless it was already sent for this payment. Both the
// webhook and the thank-you page call this, so a missed webhook still delivers.
export async function deliverOnce(order: PaidOrder) {
  const intentId = order.session.payment_intent;
  if (intentId) {
    const intent = await stripeRequest<{ metadata: Record<string, string> }>(`payment_intents/${intentId}`);
    if (intent.metadata.report_sent) return;
    // Mark first so a concurrent webhook/page request does not send twice.
    await stripeRequest(`payment_intents/${intentId}`, { "metadata[report_sent]": "1" });
  }
  try {
    await sendEmail(order.email, await renderReport(order.locale, order.slug, order.answers));
  } catch (error) {
    if (intentId) await stripeRequest(`payment_intents/${intentId}`, { "metadata[report_sent]": "" });
    await alertDeliveryFailure(order, error);
    throw error;
  }
}

// A paid order that never arrives is the worst failure this app has: the customer
// is charged and hears nothing. Both callers swallow the error to keep the page
// up, so the operator is warned here instead — over SMTP, which is already
// configured, and over ERROR_WEBHOOK_URL when one is set.
async function alertDeliveryFailure(order: PaidOrder, error: unknown) {
  const reason = error instanceof Error ? error.message : String(error);
  const lines = [
    `Test:     ${order.slug} (${order.locale})`,
    `Customer: ${order.email}`,
    `Session:  ${order.session.id}`,
    `Error:    ${reason}`,
    "",
    "The payment succeeded but the report was not delivered. Resend it with:",
    `curl -X POST ${site.url}/api/admin/resend -H "authorization: Bearer $ADMIN_TOKEN" \\`,
    `  -H "content-type: application/json" -d '{"sessionId":"${order.session.id}"}'`,
  ].join("\n");

  try {
    await sendEmail(fromAddress(), {
      subject: `[${site.name}] Report NOT delivered to ${order.email}`,
      text: lines,
    });
  } catch {
    // The mail server is the likely culprit, so a failure here is expected.
  }

  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  const text = `\u{1F6A8} Paid but undelivered\n${lines}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, content: text.slice(0, 1900) }),
    });
  } catch {
    // Never let error reporting cause another error.
  }
}
