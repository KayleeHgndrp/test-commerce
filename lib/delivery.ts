import { sendEmail } from "@/lib/email";
import { hasLocale, type Locale } from "@/lib/i18n/locales";
import { getDefinition } from "@/lib/i18n/messages";
import { renderReport } from "@/lib/report/render";
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
    throw error;
  }
}
