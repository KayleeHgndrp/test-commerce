import crypto from "node:crypto";
import { sendEmail } from "@/lib/email";
import { hasLocale } from "@/lib/i18n/locales";
import { coachCodePattern } from "@/lib/partners";
import { site } from "@/lib/site";
import { stripeRequest } from "@/lib/stripe";
import type { CheckoutSession } from "@/lib/delivery";

// A coach pack is one paid Checkout Session for coachPackSize reports. Its
// codes are derived from the payment intent and signed, so they need no
// database: "C-<payment intent>-<n>-<signature>". Stripe metadata on that
// payment intent records which codes were used (used_<n> = session id).

type Intent = { id: string; status: string; metadata: Record<string, string> };

const couponId = "coach-pack-100";

function signature(intentId: string, n: number) {
  const key = crypto.createHash("sha256").update(`coach-codes:${process.env.STRIPE_SECRET_KEY ?? ""}`).digest();
  return crypto.createHmac("sha256", key).update(`${intentId}:${n}`).digest("hex").slice(0, 10);
}

export function packCodes(intentId: string) {
  return Array.from({ length: site.coachPackSize }, (_, n) => `C-${intentId.replace(/^pi_/, "")}-${n}-${signature(intentId, n)}`);
}

function parseCode(code: string) {
  if (!coachCodePattern.test(code)) return null;
  const [, id, n, sig] = code.split("-");
  const intentId = `pi_${id}`;
  const index = Number(n);
  if (index >= site.coachPackSize) return null;
  const expected = signature(intentId, index);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return { intentId, key: `used_${index}` };
}

// Returns the code's slot when it belongs to a paid pack and is still unused.
export async function availableCoachCode(code: string) {
  const parsed = parseCode(code);
  if (!parsed || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const intent = await stripeRequest<Intent>(`payment_intents/${parsed.intentId}`);
    if (intent.status !== "succeeded" || intent.metadata.kind !== "coach_pack" || intent.metadata[parsed.key]) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Claims the code for a free report session. Returns false when the code was
// already claimed, by this session (report already sent) or by another one.
export async function claimCoachCode(code: string, sessionId: string) {
  const parsed = await availableCoachCode(code);
  if (!parsed) return false;
  await stripeRequest(`payment_intents/${parsed.intentId}`, { [`metadata[${parsed.key}]`]: sessionId });
  return true;
}

export async function releaseCoachCode(code: string) {
  const parsed = parseCode(code);
  if (parsed) await stripeRequest(`payment_intents/${parsed.intentId}`, { [`metadata[${parsed.key}]`]: "" });
}

// Free reports go through Stripe Checkout with this 100% coupon, so the
// customer confirms their email the same way a paying customer does.
export async function coachCoupon() {
  try {
    await stripeRequest(`coupons/${couponId}`);
  } catch {
    await stripeRequest("coupons", { id: couponId, percent_off: "100", duration: "once", name: "Coach code" });
  }
  return couponId;
}

export function paidPack(session: CheckoutSession) {
  if (session.metadata?.kind !== "coach_pack" || session.payment_status !== "paid" || !session.payment_intent) return null;
  const email = session.customer_details?.email ?? session.customer_email;
  const locale = hasLocale(session.metadata.locale) ? session.metadata.locale : "en";
  return email ? { email, locale, intentId: session.payment_intent, codes: packCodes(session.payment_intent) } : null;
}

export const codeLink = (locale: string, code: string) => `${site.url}/${locale}?code=${code}`;

// Emails the codes once per pack; the webhook and the codes page both call this.
export async function deliverPackOnce(pack: NonNullable<ReturnType<typeof paidPack>>) {
  const intent = await stripeRequest<Intent>(`payment_intents/${pack.intentId}`);
  if (intent.metadata.codes_sent) return;
  await stripeRequest(`payment_intents/${pack.intentId}`, { "metadata[codes_sent]": "1" });
  const lines = pack.codes.map((code, i) => `${i + 1}. ${codeLink(pack.locale, code)}`);
  try {
    await sendEmail(pack.email, {
      subject: `Your ${site.coachPackSize} report codes – ${site.name}`,
      text: [
        `Thank you for buying a coach pack from ${site.name}.`,
        "",
        `Below are ${site.coachPackSize} personal links. Each one unlocks one full report, for any of our tests, and works once.`,
        "Give one link to each client. They pick a test, answer the questions and get their full report by email at no cost.",
        "",
        ...lines,
        "",
        `Questions? Reply to this email or write to ${site.contactEmail}.`,
      ].join("\n"),
    });
  } catch (error) {
    await stripeRequest(`payment_intents/${pack.intentId}`, { "metadata[codes_sent]": "" });
    throw error;
  }
}
