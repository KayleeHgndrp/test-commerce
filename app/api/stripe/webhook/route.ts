import { sendEmail } from "@/lib/email";
import { hasLocale } from "@/lib/i18n/locales";
import { getDefinition } from "@/lib/i18n/messages";
import { renderReport } from "@/lib/report/render";
import { stripeRequest, verifyStripeSignature } from "@/lib/stripe";
import { decodeAnswers } from "@/lib/tests/scoring";

type CheckoutSession = {
  id: string;
  payment_status: string;
  payment_intent: string | null;
  customer_email: string | null;
  customer_details?: { email?: string | null };
  metadata: Record<string, string>;
};

type PaymentIntent = { metadata: Record<string, string> };

export async function POST(request: Request) {
  const payload = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return new Response("invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  // Card payments complete immediately; delayed methods (e.g. SEPA) fire async_payment_succeeded later.
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return new Response("ignored");
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") return new Response("not paid yet");

  const { slug, locale, answers } = session.metadata;
  const def = getDefinition(slug);
  const decoded = def ? decodeAnswers(def, answers) : null;
  const email = session.customer_details?.email ?? session.customer_email;
  if (!decoded || !hasLocale(locale) || !email) {
    console.error(`[webhook] cannot build report for session ${session.id}`);
    return new Response("bad metadata");
  }

  // Stripe can deliver an event more than once; remember on the payment intent that the report went out.
  if (session.payment_intent) {
    const intent = await stripeRequest<PaymentIntent>(`payment_intents/${session.payment_intent}`);
    if (intent.metadata.report_sent) return new Response("already sent");
  }

  await sendEmail(email, await renderReport(locale, slug, decoded));

  if (session.payment_intent) {
    await stripeRequest(`payment_intents/${session.payment_intent}`, { "metadata[report_sent]": "1" });
  }
  return new Response("ok");
}
