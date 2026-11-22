import crypto from "node:crypto";

// The follow-up emails give people who did not buy their report a short-lived lower
// price (site.offerPriceCents). The email links to the result page with
// ?offer=<expiry>.<signature>; checkout only applies the price when the signature
// matches the test and the expiry has not passed, so the link cannot be reused for
// another test or edited to last longer.

// A few hours of grace after the date shown in the email, so nobody west of UTC sees
// the offer end before their own end of that day.
const GRACE_MS = 12 * 3600000;

const secret = () => process.env.EMAIL_LINK_SECRET || process.env.BREVO_API_KEY || "dev";
const sign = (slug: string, expires: number) =>
  crypto.createHmac("sha256", secret()).update(`offer:${slug}:${expires}`).digest("base64url").slice(0, 16);

// The last day of the offer: the end of the UTC day `days` days after `from`.
export function offerUntil(from: number, days = 2) {
  const d = new Date(from + days * 86400000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59);
}

export function offerToken(slug: string, until: number) {
  const expires = Math.floor((until + GRACE_MS) / 1000);
  return `${expires}.${sign(slug, expires)}`;
}

// Expiry in ms of a well-formed token, without checking the signature. The result
// page uses it to decide whether to show the offer; checkout checks the signature.
export function offerExpires(token: string | null | undefined) {
  const match = typeof token === "string" ? /^(\d{9,11})\.([\w-]{16})$/.exec(token) : null;
  return match ? Number(match[1]) * 1000 : null;
}

export function validOffer(slug: string, token: unknown, now = Date.now()) {
  if (typeof token !== "string") return false;
  const expires = offerExpires(token);
  if (!expires || expires <= now) return false;
  const a = Buffer.from(sign(slug, expires / 1000));
  const b = Buffer.from(token.split(".")[1]);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// The offer's last day as the email shows it, for example "zondag 22 november".
export function formatOfferDate(locale: string, until: number) {
  const tag = locale === "no" ? "nb" : locale;
  return new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(until);
}
