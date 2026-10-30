import { fromAddress, sendEmail } from "@/lib/email";
import { hasLocale, type Locale } from "@/lib/i18n/locales";
import { allDefinitions, fmt, getDefinition, getUi } from "@/lib/i18n/messages";
import { renderCoupleReport, renderReport } from "@/lib/report/render";
import { site } from "@/lib/site";
import { stripeRequest } from "@/lib/stripe";
import { decodeAnswers } from "@/lib/tests/scoring";

export type CheckoutSession = {
  id: string;
  created: number;
  amount_total?: number | null;
  payment_status: string;
  payment_intent: string | null;
  customer_email: string | null;
  customer_details?: { email?: string | null };
  metadata: Record<string, string>;
};

// single: one report; pack: this report plus credits for other tests;
// all: every report; couple: one report comparing the buyer with a partner.
export type Plan = "single" | "pack" | "all" | "couple";
export const plans: Plan[] = ["single", "pack", "all", "couple"];

export type PaidOrder = {
  locale: Locale;
  slug: string;
  answers: number[];
  email: string;
  plan: Plan;
  partner?: { answers: number[]; name: string };
  session: CheckoutSession;
};

// Validates a Checkout Session and extracts the order it paid for.
export function paidOrder(session: CheckoutSession): PaidOrder | null {
  if (session.payment_status !== "paid") return null;
  const { slug, locale, answers, plan = "single", partner_answers, partner_name } = session.metadata ?? {};
  const def = getDefinition(slug);
  const decoded = def ? decodeAnswers(def, answers) : null;
  const email = session.customer_details?.email ?? session.customer_email;
  if (!decoded || !hasLocale(locale) || !email || !plans.includes(plan as Plan)) return null;
  const order: PaidOrder = { locale, slug, answers: decoded, email, plan: plan as Plan, session };
  if (plan === "couple") {
    const partner = decodeAnswers(def!, partner_answers ?? "");
    if (!partner) return null;
    order.partner = { answers: partner, name: partner_name ?? "" };
  }
  return order;
}

export async function retrievePaidOrder(sessionId: string) {
  if (!process.env.STRIPE_SECRET_KEY || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  try {
    return paidOrder(await stripeRequest<CheckoutSession>(`checkout/sessions/${sessionId}`));
  } catch {
    return null;
  }
}

// A paid order unlocks one more report at the bundle price within bundleDays,
// for a different test. Returns the order's session when the offer still applies.
export async function validBundleSource(sessionId: string, slug: string) {
  const order = await retrievePaidOrder(sessionId);
  if (!order || order.plan !== "single" || order.slug === slug || order.session.metadata.bundle_from) return null;
  if (Date.now() / 1000 - order.session.created > site.bundleDays * 86400) return null;
  const intentId = order.session.payment_intent;
  if (!intentId) return null;
  const intent = await stripeRequest<{ metadata: Record<string, string> }>(`payment_intents/${intentId}`);
  return intent.metadata.bundle_used ? null : order.session;
}

// Marks the order that unlocked a bundle price as used, so the offer works once.
async function markBundleUsed(order: PaidOrder) {
  const from = order.session.metadata.bundle_from;
  if (!from) return;
  try {
    const source = await stripeRequest<CheckoutSession>(`checkout/sessions/${from}`);
    if (source.payment_intent) await stripeRequest(`payment_intents/${source.payment_intent}`, { "metadata[bundle_used]": order.session.id });
  } catch (error) {
    console.error("[bundle] could not mark offer as used", error);
  }
}

// A pack or all-access order keeps the tests it has unlocked in the metadata of
// its PaymentIntent, next to the test it was bought on.
export type Pass = { order: PaidOrder; intentId: string; covered: string[]; remaining: number };

export async function retrievePass(sessionId: string): Promise<Pass | null> {
  const order = await retrievePaidOrder(sessionId);
  const intentId = order?.session.payment_intent;
  if (!order || !intentId || (order.plan !== "pack" && order.plan !== "all")) return null;
  const intent = await stripeRequest<{ metadata: Record<string, string> }>(`payment_intents/${intentId}`);
  const covered = [order.slug, ...(intent.metadata.redeemed ?? "").split(",").filter(Boolean)];
  const total = order.plan === "all" ? allDefinitions.length : site.packSize;
  return { order, intentId, covered, remaining: Math.max(0, total - covered.length) };
}

// Uses one credit of the pass for slug. Returns false when no credit is left.
export async function redeemPass(pass: Pass, slug: string) {
  if (pass.covered.includes(slug)) return true;
  if (pass.remaining < 1) return false;
  const redeemed = [...pass.covered.slice(1), slug];
  await stripeRequest(`payment_intents/${pass.intentId}`, { "metadata[redeemed]": redeemed.join(",") });
  pass.covered.push(slug);
  pass.remaining -= 1;
  return true;
}

// The email for a paid order: the couple report, or the normal report with a
// link that brings the pack to another device.
export async function renderOrder(order: PaidOrder) {
  if (order.partner) {
    return renderCoupleReport(order.locale, order.slug, order.answers, order.partner.answers, order.partner.name);
  }
  let extra: string | undefined;
  if (order.plan === "pack" || order.plan === "all") {
    const ui = await getUi(order.locale);
    const link = `${site.url}/${order.locale}/pass?id=${order.session.id}`;
    extra = fmt(order.plan === "all" ? ui.report.passLineAll : ui.report.passLine, { count: site.packSize - 1, link });
  }
  return renderReport(order.locale, order.slug, order.answers, extra);
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
  await markBundleUsed(order);
  try {
    await sendEmail(order.email, await renderOrder(order));
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
