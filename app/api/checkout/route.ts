import { hasLocale } from "@/lib/i18n/locales";
import { getDefinition, getTestText } from "@/lib/i18n/messages";
import { sendEmail } from "@/lib/email";
import { renderReport } from "@/lib/report/render";
import { site } from "@/lib/site";
import { stripeRequest } from "@/lib/stripe";
import { decodeAnswers } from "@/lib/tests/scoring";

const STRIPE_LOCALES = new Set([
  "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hr", "hu", "it", "lt", "lv",
  "mt", "nl", "pl", "pt", "ro", "sk", "sl", "sv", "tr",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { slug, locale, email, answers, gender } = (body ?? {}) as Record<string, string>;

  const def = typeof slug === "string" ? getDefinition(slug) : undefined;
  const decoded = def && typeof answers === "string" ? decodeAnswers(def, answers) : null;
  const validEmail = typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!def || !decoded || !validEmail || typeof locale !== "string" || !hasLocale(locale)) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const thanksUrl = `${origin}/${locale}/${slug}/thanks`;

  // Local development without Stripe: deliver the report immediately.
  if (!process.env.STRIPE_SECRET_KEY) {
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "payments_not_configured" }, { status: 500 });
    }
    await sendEmail(email, await renderReport(locale, slug, decoded));
    return Response.json({ url: `${thanksUrl}?dev_answers=${answers}` });
  }

  const text = await getTestText(locale, slug);
  const session = await stripeRequest<{ url: string }>("checkout/sessions", {
    mode: "payment",
    customer_email: email,
    locale: STRIPE_LOCALES.has(locale) ? locale : locale === "no" ? "nb" : "auto",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": site.currency,
    "line_items[0][price_data][unit_amount]": String(site.priceCents),
    "line_items[0][price_data][product_data][name]": `${text.name} – ${site.name}`,
    success_url: `${thanksUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${locale}/${slug}/result`,
    "metadata[slug]": slug,
    "metadata[locale]": locale,
    "metadata[answers]": answers,
    "metadata[gender]": ["male", "female", "other"].includes(gender) ? gender : "other",
  });

  return Response.json({ url: session.url });
}
