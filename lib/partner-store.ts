import { site } from "@/lib/site";
import { stripeRequest } from "@/lib/stripe";

// Partners live in Stripe as Customers tagged metadata.partner=1, so the portal
// needs no database: Stripe already holds the sales, and the same account keeps
// the partner list, their click counts and the payouts that were made.
//
// Metadata per partner (Stripe allows 50 keys of up to 500 characters):
//   partner_ref       the name in their link (?ref=…)
//   partner_name      name or brand, partner_site their website or profile
//   partner_locale    language of the portal and emails
//   partner_created   unix seconds; sales before this moment are not theirs
//   partner_verified  "1" once they opened a login link (proves the email address)
//   partner_status    "active" or "blocked"
//   partner_clicks    JSON {"t": total, "2026-11": 12, ...} (last months only)
//   partner_paid      JSON [["2026-Q4", cents, "2027-01-05"], ...] payouts made
//   partner_payout    date on which they sent their bank details by email

export type Customer = { id: string; email: string | null; created: number; metadata: Record<string, string> };

export type Partner = {
  id: string;
  email: string;
  ref: string;
  name: string;
  site: string;
  locale: string;
  created: number;
  verified: boolean;
  status: "active" | "blocked";
  clicks: Record<string, number>;
  payouts: { period: string; cents: number; date: string }[];
  payoutDetailsSent: string;
};

export const minimumPayoutCents = 2500;
// A ref that was claimed but never confirmed by email is released after this.
const unverifiedHours = 48;
export const reservedRefs = new Set([
  "admin", "partner", "partners", "test", "tests", "personalityreveal", "personality-reveal",
  "support", "info", "stripe", "google", "facebook", "instagram", "tiktok", "pinterest",
]);

function parseJson<T>(value: string | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function toPartner(customer: Customer): Partner | null {
  const m = customer.metadata ?? {};
  if (m.partner !== "1" || !m.partner_ref) return null;
  return {
    id: customer.id,
    email: customer.email ?? "",
    ref: m.partner_ref,
    name: m.partner_name ?? "",
    site: m.partner_site ?? "",
    locale: m.partner_locale ?? "en",
    created: Number(m.partner_created) || customer.created,
    verified: m.partner_verified === "1",
    status: m.partner_status === "blocked" ? "blocked" : "active",
    clicks: parseJson(m.partner_clicks, {}),
    payouts: parseJson<[string, number, string][]>(m.partner_paid, []).map(([period, cents, date]) => ({ period, cents, date })),
    payoutDetailsSent: m.partner_payout ?? "",
  };
}

const isStale = (p: Partner) => !p.verified && Date.now() / 1000 - p.created > unverifiedHours * 3600;

// Search values are quoted; our refs and emails are validated to contain no quotes.
async function search(query: string) {
  const customers: Customer[] = [];
  let page = "";
  for (;;) {
    const result = await stripeRequest<{ data: Customer[]; has_more: boolean; next_page: string | null }>(
      `customers/search?limit=100&query=${encodeURIComponent(query)}${page}`,
    );
    customers.push(...result.data);
    if (!result.has_more || !result.next_page) break;
    page = `&page=${encodeURIComponent(result.next_page)}`;
  }
  return customers.map(toPartner).filter((p): p is Partner => p !== null);
}

export async function getPartner(id: string) {
  const customer = await stripeRequest<Customer & { deleted?: boolean }>(`customers/${id}`);
  return customer.deleted ? null : toPartner(customer);
}

// Note: Stripe search can lag up to about a minute behind new customers.
export async function findByRef(ref: string) {
  return (await search(`metadata['partner_ref']:'${ref}'`)).find((p) => !isStale(p)) ?? null;
}

export async function findByEmail(email: string) {
  return (await search(`email:'${email}'`)).find((p) => !isStale(p)) ?? null;
}

export async function allPartners() {
  const partners = await search(`metadata['partner']:'1'`);
  return partners.filter((p) => !isStale(p)).sort((a, b) => a.created - b.created);
}

// Removes stale, unconfirmed claims of a ref or email so someone else can take them.
export async function releaseStale(ref: string, email: string) {
  const stale = [...(await search(`metadata['partner_ref']:'${ref}'`)), ...(await search(`email:'${email}'`))].filter(isStale);
  await Promise.all(
    stale.map((p) =>
      fetch(`https://api.stripe.com/v1/customers/${p.id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      }),
    ),
  );
}

export async function createPartner(input: { email: string; ref: string; name: string; site: string; locale: string }) {
  const customer = await stripeRequest<Customer>("customers", {
    email: input.email,
    name: input.name,
    description: `Partner (?ref=${input.ref})`,
    "metadata[partner]": "1",
    "metadata[partner_ref]": input.ref,
    "metadata[partner_name]": input.name,
    "metadata[partner_site]": input.site,
    "metadata[partner_locale]": input.locale,
    "metadata[partner_created]": String(Math.floor(Date.now() / 1000)),
    "metadata[partner_verified]": "",
    "metadata[partner_status]": "active",
  });
  return toPartner(customer)!;
}

export async function updatePartner(id: string, metadata: Record<string, string>) {
  const params = Object.fromEntries(Object.entries(metadata).map(([key, value]) => [`metadata[${key}]`, value]));
  return toPartner(await stripeRequest<Customer>(`customers/${id}`, params));
}

export const monthKey = (date = new Date()) => date.toISOString().slice(0, 7);

// Counts one click on a partner link. Two clicks at the same moment can overwrite
// each other, so the number is a close estimate rather than an exact count.
const refToId = new Map<string, { id: string | null; until: number }>();
export async function recordClick(ref: string) {
  let cached = refToId.get(ref);
  if (!cached || cached.until < Date.now()) {
    const partner = await findByRef(ref);
    const id = partner?.verified && partner.status === "active" ? partner.id : null;
    // A miss is cached briefly, so a partner who just confirmed starts counting soon.
    cached = { id, until: Date.now() + (id ? 10 : 1) * 60000 };
    refToId.set(ref, cached);
  }
  if (!cached.id) return;
  const partner = await getPartner(cached.id);
  if (!partner) return;
  const clicks = { ...partner.clicks };
  const month = monthKey();
  clicks.t = (clicks.t ?? 0) + 1;
  clicks[month] = (clicks[month] ?? 0) + 1;
  // Keep the total and the most recent months within Stripe's 500 character limit.
  const months = Object.keys(clicks).filter((k) => k !== "t").sort().reverse().slice(0, 24);
  const kept: Record<string, number> = { t: clicks.t };
  for (const m of months) kept[m] = clicks[m];
  await updatePartner(partner.id, { partner_clicks: JSON.stringify(kept) });
}

export async function recordPayout(partner: Partner, period: string, cents: number) {
  const list: [string, number, string][] = partner.payouts.map((p) => [p.period, p.cents, p.date]);
  list.push([period, cents, new Date().toISOString().slice(0, 10)]);
  // Older payouts are merged into one line if the list grows past the limit.
  while (JSON.stringify(list).length > 480 && list.length > 2) {
    const [a, b] = list.splice(0, 2);
    list.unshift([`${a[0]}..${b[0]}`, a[1] + b[1], b[2]]);
  }
  return updatePartner(partner.id, { partner_paid: JSON.stringify(list) });
}

// Sales ------------------------------------------------------------------

export type Sale = { ref: string; created: number; plan: string; netCents: number; commissionCents: number; quarter: string };

type Session = {
  id: string;
  created: number;
  amount_total: number | null;
  payment_status: string;
  payment_intent: string | null;
  metadata: Record<string, string>;
  total_details?: { amount_tax?: number };
};

export const quarterOf = (unixSeconds: number) => {
  const d = new Date(unixSeconds * 1000);
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
};

// Net revenue = amount paid minus VAT minus Stripe's fee (exact when the balance
// transaction is available, otherwise estimated). Refunded payments count as 0.
async function netCents(session: Session) {
  const gross = session.amount_total ?? 0;
  const tax = session.total_details?.amount_tax ?? 0;
  let fee = Math.round(gross * 0.015 + 25);
  if (session.payment_intent) {
    try {
      const intent = await stripeRequest<{
        latest_charge?: { refunded?: boolean; amount_refunded?: number; balance_transaction?: { fee?: number } | null };
      }>(`payment_intents/${session.payment_intent}?expand[]=latest_charge.balance_transaction`);
      const charge = intent.latest_charge;
      if (charge?.refunded || charge?.amount_refunded) return 0;
      if (charge?.balance_transaction?.fee != null) fee = charge.balance_transaction.fee;
    } catch {}
  }
  return Math.max(0, gross - tax - fee);
}

// Every paid sale that came in through a partner link since `since`. Cached per
// server instance for a few minutes so dashboards stay quick.
const salesCache = new Map<number, { until: number; sales: Promise<Sale[]> }>();
export function referredSales(since: number) {
  const key = Math.floor(since / 86400) * 86400;
  const hit = salesCache.get(key);
  if (hit && hit.until > Date.now()) return hit.sales;
  const sales = loadSales(key).catch((error) => {
    salesCache.delete(key);
    throw error;
  });
  salesCache.set(key, { until: Date.now() + 5 * 60000, sales });
  return sales;
}

async function loadSales(since: number) {
  const sales: Sale[] = [];
  let after = "";
  for (;;) {
    const page = await stripeRequest<{ data: Session[]; has_more: boolean }>(
      `checkout/sessions?limit=100&status=complete&created[gte]=${since}${after}`,
    );
    const referred = page.data.filter((s) => s.metadata?.ref && s.payment_status === "paid");
    const nets = await Promise.all(referred.map(netCents));
    referred.forEach((s, i) =>
      sales.push({
        ref: s.metadata.ref,
        created: s.created,
        plan: s.metadata.plan ?? "single",
        netCents: nets[i],
        commissionCents: Math.round(nets[i] * site.affiliateShare),
        quarter: quarterOf(s.created),
      }),
    );
    if (!page.has_more || !page.data.length) break;
    after = `&starting_after=${page.data.at(-1)!.id}`;
  }
  return sales.sort((a, b) => b.created - a.created);
}

export type Summary = {
  sales: number;
  earnedCents: number;
  currentQuarter: string;
  currentQuarterCents: number;
  closedCents: number;
  paidCents: number;
  payableCents: number;
  due: boolean;
};

// Commission from finished quarters can be paid out; the running quarter waits
// until it ends, so refunds in that quarter are taken into account first.
export function summarize(partner: Partner, sales: Sale[]): Summary {
  const own = sales.filter((s) => s.ref === partner.ref && s.created >= partner.created);
  const currentQuarter = quarterOf(Date.now() / 1000);
  const earnedCents = own.reduce((sum, s) => sum + s.commissionCents, 0);
  const currentQuarterCents = own.filter((s) => s.quarter === currentQuarter).reduce((sum, s) => sum + s.commissionCents, 0);
  const closedCents = earnedCents - currentQuarterCents;
  const paidCents = partner.payouts.reduce((sum, p) => sum + p.cents, 0);
  const payableCents = Math.max(0, closedCents - paidCents);
  return {
    sales: own.length,
    earnedCents,
    currentQuarter,
    currentQuarterCents,
    closedCents,
    paidCents,
    payableCents,
    due: payableCents >= minimumPayoutCents,
  };
}
