import { hasLocale } from "@/lib/i18n/locales";
import { allDefinitions, fmt, getDefinition, getTestText, getUi } from "@/lib/i18n/messages";
import { plans, type Plan } from "@/lib/delivery";
import { emailFlowAllowed } from "@/lib/emailFlow";
import { sendEmail } from "@/lib/email";
import { refPattern } from "@/lib/partners";
import { renderReport } from "@/lib/report/render";
import { site } from "@/lib/site";
import { stripeRequest } from "@/lib/stripe";
import { cleanName } from "@/lib/tests/couple";
import { decodeAnswers } from "@/lib/tests/scoring";

const STRIPE_LOCALES = new Set([
  "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hr", "hu", "it", "lt", "lv",
  "mt", "nl", "pl", "pt", "ro", "sk", "sl", "sv", "tr",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { slug, locale, email, answers, gender, partnerAnswers, partnerName, ref } = (body ?? {}) as Record<string, string>;
  const plan = (plans.includes(body?.plan as Plan) ? body!.plan : "single") as Plan;
  const newsletter = body?.newsletter === true;

  const def = typeof slug === "string" ? getDefinition(slug) : undefined;
  const decoded = def && typeof answers === "string" ? decodeAnswers(def, answers) : null;
  // The email is optional: without one, Stripe Checkout asks for it on the payment page.
  const hasEmail = email !== undefined && email !== "";
  const validEmail = typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!def || !decoded || (hasEmail && !validEmail) || typeof locale !== "string" || !hasLocale(locale)) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const partner = plan === "couple" && typeof partnerAnswers === "string" ? decodeAnswers(def, partnerAnswers) : null;
  if (plan === "couple" && (!partner || !site.coupleTests.includes(slug))) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const thanksUrl = `${origin}/${locale}/${slug}/thanks`;

  // Local development without Stripe: deliver the report immediately.
  if (!process.env.STRIPE_SECRET_KEY) {
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "payments_not_configured" }, { status: 500 });
    }
    if (validEmail) await sendEmail(email, await renderReport(locale, slug, decoded));
    return Response.json({ url: `${thanksUrl}?dev_answers=${answers}` });
  }

  const [ui, text] = await Promise.all([getUi(locale), getTestText(locale, slug)]);
  const price = { single: site.priceCents, pack: site.packPriceCents, all: site.allPriceCents, couple: site.couplePriceCents }[plan];
  const product = {
    single: text.name,
    pack: fmt(ui.plans.packProduct, { test: text.name, extra: site.packSize - 1 }),
    all: fmt(ui.plans.allProduct, { count: allDefinitions.length }),
    couple: fmt(ui.couple.product, { test: text.name }),
  }[plan];
  const referral = typeof ref === "string" && refPattern.test(ref) ? ref : null;
  const session = await stripeRequest<{ url: string }>("checkout/sessions", {
    mode: "payment",
    ...(validEmail ? { customer_email: email } : {}),
    locale: STRIPE_LOCALES.has(locale) ? locale : locale === "no" ? "nb" : "auto",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": site.currency,
    "line_items[0][price_data][unit_amount]": String(price),
    "line_items[0][price_data][product_data][name]": `${product} | ${site.name}`,
    success_url: `${thanksUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${locale}/${slug}/result`,
    // The advertised price includes VAT. With Stripe Tax enabled, Stripe works out
    // the VAT rate of the customer's EU country (OSS) from the billing details.
    "line_items[0][price_data][tax_behavior]": "inclusive",
    ...(process.env.STRIPE_AUTOMATIC_TAX === "true" ? { "automatic_tax[enabled]": "true" } : {}),
    "metadata[slug]": slug,
    "metadata[locale]": locale,
    "metadata[answers]": answers,
    "metadata[gender]": ["male", "female", "other"].includes(gender) ? gender : "other",
    "metadata[plan]": plan,
    ...(partner ? { "metadata[partner_answers]": partnerAnswers, "metadata[partner_name]": cleanName(partnerName) } : {}),
    ...(referral ? { "metadata[ref]": referral } : {}),
    ...(newsletter && emailFlowAllowed(def) ? { "metadata[newsletter]": "1" } : {}),
  });

  return Response.json({ url: session.url });
}
