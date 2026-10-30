import { hasLocale } from "@/lib/i18n/locales";
import { site } from "@/lib/site";
import { stripeRequest } from "@/lib/stripe";

// Starts the Stripe Checkout for a coach pack of prepaid report codes.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { locale, email } = (body ?? {}) as Record<string, string>;
  const validEmail = typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!validEmail || typeof locale !== "string" || !hasLocale(locale)) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "payments_not_configured" }, { status: 500 });

  const origin = new URL(request.url).origin;
  const session = await stripeRequest<{ url: string }>("checkout/sessions", {
    mode: "payment",
    customer_email: email,
    locale: "auto",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": site.currency,
    "line_items[0][price_data][unit_amount]": String(site.coachPackCents),
    "line_items[0][price_data][product_data][name]": `Coach pack: ${site.coachPackSize} report codes – ${site.name}`,
    "line_items[0][price_data][tax_behavior]": "inclusive",
    ...(process.env.STRIPE_AUTOMATIC_TAX === "true" ? { "automatic_tax[enabled]": "true" } : {}),
    success_url: `${origin}/${locale}/partners/codes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${locale}/partners`,
    "metadata[kind]": "coach_pack",
    "metadata[locale]": locale,
    // The codes are checked against the payment intent, so it carries the kind too.
    "payment_intent_data[metadata][kind]": "coach_pack",
  });
  return Response.json({ url: session.url });
}
