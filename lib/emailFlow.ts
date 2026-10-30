import crypto from "node:crypto";
import { brevoEnabled, getContact, sendBrevoEmail, updateContact, upsertContact, type Contact } from "@/lib/brevo";
import { validBundleSource, type PaidOrder } from "@/lib/delivery";
import { fromAddress } from "@/lib/email";
import { hasLocale, toLangTag, type Locale } from "@/lib/i18n/locales";
import { allDefinitions, fmt, getDefinition, getEmailMessages, getTestText, getUi } from "@/lib/i18n/messages";
import { formatPrice, site } from "@/lib/site";
import { decodeAnswers, encodeAnswers, scoreTest } from "@/lib/tests/scoring";
import type { TestDefinition, TestResult, TestText } from "@/lib/tests/types";

// The welcome flow after a test, in the visitor's language:
//   lead:  result (day 0), insight (day 2), next test (day 5), last chance (day 7)
//   buyer: next test (day 2), bundle offer (day 5, while the €1.95 offer still runs)
// A purchase moves a contact onto the buyer track. FLOW_STEP is the next step to
// send; a daily cron (app/api/cron/email-flow) sends whatever is due.
type Step = "result" | "insight" | "nextTest" | "lastChance" | "bundle";
const LEAD: Step[] = ["result", "insight", "nextTest", "lastChance"];
const BUYER: Step[] = ["result", "insight", "nextTest", "bundle"];
const DUE_DAY = { lead: [0, 2, 5, 7], buyer: [0, 0, 2, 5] };
const BUYER_START = 2;
export const FLOW_DONE = 4;

// Screener results are health data and political views are a special category
// too (GDPR art. 9), so those answers never leave the site for marketing.
export const emailFlowAllowed = (def: TestDefinition) => def.category !== "screeners" && def.outcome !== "political";

const day = 86400000;
const sender = () => ({ name: site.name, email: process.env.BREVO_SENDER_EMAIL || fromAddress() });

// Signs unsubscribe links so nobody can unsubscribe someone else.
export function unsubscribeToken(email: string) {
  const secret = process.env.EMAIL_LINK_SECRET || process.env.BREVO_API_KEY || "dev";
  return crypto.createHmac("sha256", secret).update(email.toLowerCase()).digest("base64url").slice(0, 24);
}

export function validUnsubscribeToken(email: string, token: string) {
  const a = Buffer.from(unsubscribeToken(email));
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const unsubscribeUrl = (email: string, locale: Locale) =>
  `${site.url}/api/email/unsubscribe?${new URLSearchParams({ e: email, t: unsubscribeToken(email), l: locale })}`;

const utm = (step: Step) => `utm_source=brevo&utm_medium=email&utm_campaign=flow-${step}`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// The main outcome: a named type when the test has one, otherwise the strongest dimension.
function mainResult(text: TestText, result: TestResult) {
  const type = result.type ? text.types?.[result.type] : undefined;
  if (type) return { dim: result.type, name: /^[A-Z]{4}$/.test(result.type!) ? `${result.type} · ${type.name}` : type.name, text: "" };
  const dim = result.type ?? [...result.scores].sort((a, b) => b.percent - a.percent)[0].dim;
  return { dim, name: text.dimensions[dim]?.name ?? dim, text: text.dimensions[dim]?.short ?? "" };
}

// The most pronounced score besides the main result: the part of the report most
// likely to feel recognisable.
function standOut(result: TestResult, skip?: string) {
  return [...result.scores].filter((s) => s.dim !== skip).sort((a, b) => Math.abs(b.percent - 50) - Math.abs(a.percent - 50))[0];
}

function relatedTest(def: TestDefinition) {
  const allowed = allDefinitions.filter((d) => d.slug !== def.slug && emailFlowAllowed(d));
  return allowed.find((d) => d.category === def.category) ?? allowed[0];
}

type FlowContact = { email: string; locale: Locale; def: TestDefinition; answers: number[]; gender: string; purchasedAt?: number; bundleSession?: string };

function fromAttributes(contact: Contact): FlowContact | null {
  const a = contact.attributes;
  const locale = String(a.LOCALE ?? "");
  const def = getDefinition(String(a.TEST ?? ""));
  const answers = def ? decodeAnswers(def, String(a.ANSWERS ?? "")) : null;
  if (!def || !answers || !hasLocale(locale)) return null;
  const purchasedAt = a.PURCHASED_AT ? Date.parse(String(a.PURCHASED_AT)) : undefined;
  return { email: contact.email, locale, def, answers, gender: String(a.GENDER ?? "other"), purchasedAt, bundleSession: a.BUNDLE_SESSION ? String(a.BUNDLE_SESSION) : undefined };
}

// Builds one email of the flow. Returns null when the step does not apply (for
// example a bundle offer that was already used), so the flow moves on.
async function buildEmail(step: Step, c: FlowContact) {
  const [m, ui, text] = await Promise.all([getEmailMessages(c.locale), getUi(c.locale), getTestText(c.locale, c.def.slug)]);
  const result = scoreTest(c.def, c.answers);
  const price = formatPrice(c.locale);
  const vars: Record<string, string | number> = { test: text.name, site: site.name, price, full: price };
  const resultUrl = `${site.url}/${c.locale}/${c.def.slug}/result?r=${encodeAnswers(c.answers)}-${c.gender}&${utm(step)}`;
  let highlight: { label: string; name: string; text: string } | undefined;
  let cta = { label: "", url: resultUrl };
  const copy = m[step];

  if (step === "result") {
    const main = mainResult(text, result);
    highlight = { label: m.result.label, name: main.name, text: main.text };
  } else if (step === "insight") {
    const score = standOut(result, mainResult(text, result).dim);
    if (!score) return null;
    const dim = text.dimensions[score.dim];
    highlight = { label: "", name: fmt(m.insight.label, { dimension: dim.name, level: ui.levels[score.level].toLowerCase() }), text: dim[score.level] };
  } else if (step === "nextTest") {
    const next = relatedTest(c.def);
    const nextText = await getTestText(c.locale, next.slug);
    vars.minutes = next.minutes;
    highlight = { label: "", name: nextText.name, text: nextText.tagline };
    cta = { label: "", url: `${site.url}/${c.locale}/${next.slug}?${utm(step)}` };
  } else if (step === "bundle") {
    if (!c.bundleSession || !c.purchasedAt) return null;
    const source = await validBundleSource(c.bundleSession, relatedTest(c.def).slug).catch(() => null);
    if (!source) return null;
    const until = (source.created + site.bundleDays * 86400) * 1000;
    vars.price = formatPrice(c.locale, site.bundlePriceCents);
    vars.date = new Intl.DateTimeFormat(toLangTag(c.locale), { day: "numeric", month: "long" }).format(until);
    cta = { label: "", url: `${site.url}/${c.locale}?offer=${source.id}.${c.def.slug}.${until}&${utm(step)}#tests` };
  }
  cta.label = fmt(copy.cta, vars);

  const unsubscribe = unsubscribeUrl(c.email, c.locale);
  const paragraphs = [m.greeting, fmt(copy.intro, vars)];
  const outro = fmt(copy.outro, vars);
  const footer = fmt(m.footer, vars);
  const html = `<!doctype html><html lang="${toLangTag(c.locale)}" style="color-scheme:light only"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head><body style="margin:0;background:#f7f6f2;font-family:Manrope,Arial,Helvetica,sans-serif;color:#17152b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="padding:28px 32px 0;font-size:14px;font-weight:bold;color:#6246ea">${esc(site.name)}</td></tr>
<tr><td style="padding:16px 32px 28px;font-size:16px;line-height:1.6">
${paragraphs.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join("\n")}
${highlight ? `<div style="background:#efecfd;border-radius:12px;padding:18px 20px;margin:18px 0">${highlight.label ? `<div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6246ea;font-weight:bold">${esc(highlight.label)}</div>` : ""}<div style="font-size:20px;font-weight:bold;margin:4px 0 6px">${esc(highlight.name)}</div>${highlight.text ? `<div style="font-size:15px;color:#3d3a52">${esc(highlight.text)}</div>` : ""}</div>` : ""}
<p style="margin:0 0 22px">${esc(outro)}</p>
<p style="margin:0 0 26px"><a href="${esc(cta.url)}" style="display:inline-block;background:#6246ea;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:10px">${esc(cta.label)}</a></p>
<p style="margin:0">${esc(m.signoff)}<br>${esc(fmt(m.team, vars))}</p>
</td></tr>
<tr><td style="padding:18px 32px;background:#f8f7fc;color:#625f7a;font-size:12px;line-height:1.5">${esc(footer)}<br><a href="${esc(unsubscribe)}" style="color:#625f7a">${esc(m.unsubscribe)}</a></td></tr>
</table></td></tr></table></body></html>`;
  const plain = [
    ...paragraphs,
    highlight ? [highlight.label, highlight.name, highlight.text].filter(Boolean).join("\n") : "",
    outro,
    `${cta.label}: ${cta.url}`,
    `${m.signoff}\n${fmt(m.team, vars)}`,
    `--\n${footer}\n${m.unsubscribe}: ${unsubscribe}`,
  ].filter(Boolean).join("\n\n");

  return { subject: fmt(copy.subject, vars), html, text: plain, unsubscribeUrl: unsubscribe, tag: `flow-${step}` };
}

async function send(step: Step, c: FlowContact) {
  const email = await buildEmail(step, c);
  if (!email) return false;
  if (!brevoEnabled()) {
    console.log(`[email-flow] BREVO_API_KEY not set – would send "${email.subject}" to ${c.email}`);
    return true;
  }
  await sendBrevoEmail(c.email, email, sender());
  return true;
}

// Opt-in from the result page: store the contact and send the result right away.
export async function subscribe(input: { email: string; locale: Locale; def: TestDefinition; answers: number[]; gender: string }) {
  const now = new Date().toISOString();
  const contact: FlowContact = { ...input };
  if (brevoEnabled()) {
    await upsertContact(input.email, {
      LOCALE: input.locale,
      TEST: input.def.slug,
      ANSWERS: encodeAnswers(input.answers),
      GENDER: input.gender,
      CONSENT_AT: now,
      FLOW_START: now,
      FLOW_STEP: 0,
      PURCHASED_AT: "",
      BUNDLE_SESSION: "",
    }, true);
  }
  await send("result", contact);
  if (brevoEnabled()) await updateContact(input.email, { attributes: { FLOW_STEP: 1 } });
}

// After a paid order: buyers who opted in at checkout join the flow, and existing
// contacts switch to the buyer track so they are not asked to buy again.
export async function onPurchase(order: PaidOrder) {
  if (!brevoEnabled()) return;
  const def = getDefinition(order.slug);
  const optedIn = order.session.metadata.newsletter === "1" && def && emailFlowAllowed(def);
  if (!optedIn && !(await getContact(order.email))) return;
  const now = new Date().toISOString();
  const allowed = def && emailFlowAllowed(def);
  await upsertContact(order.email, {
    PURCHASED_AT: now,
    FLOW_START: now,
    FLOW_STEP: allowed ? BUYER_START : FLOW_DONE,
    BUNDLE_SESSION: order.session.metadata.bundle_from ? "" : order.session.id,
    ...(allowed ? { LOCALE: order.locale, TEST: order.slug, ANSWERS: encodeAnswers(order.answers), GENDER: order.session.metadata.gender ?? "other" } : {}),
    ...(optedIn ? { CONSENT_AT: now } : {}),
  }, Boolean(optedIn));
}

// Sends the next due email to one contact. The step is saved before sending, so a
// failure can skip an email but never send it twice.
export async function advance(contact: Contact, now = Date.now()) {
  const step = Number(contact.attributes.FLOW_STEP ?? FLOW_DONE);
  if (contact.emailBlacklisted || !(step >= 0 && step < FLOW_DONE)) return false;
  const c = fromAttributes(contact);
  if (!c) return false;
  const track = c.purchasedAt ? "buyer" : "lead";
  const start = Date.parse(String(contact.attributes.FLOW_START ?? ""));
  // The cron runs once a day, so allow half a day of slack to land on the right day.
  if (!(now - start >= DUE_DAY[track][step] * day - day / 2)) return false;
  await updateContact(c.email, { attributes: { FLOW_STEP: step + 1 } });
  return send((track === "buyer" ? BUYER : LEAD)[step], c);
}
