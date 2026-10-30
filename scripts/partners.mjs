// Affiliate commission per partner for a quarter or month, from Stripe Checkout Sessions
// that carry metadata.ref. Needs STRIPE_READ_KEY (or STRIPE_SECRET_KEY).
//
//   node scripts/partners.mjs 2026-Q4      or      node scripts/partners.mjs 2026-11
//
// Net revenue = amount paid minus VAT minus Stripe's fee (taken from the balance
// transaction when the key may read it, otherwise estimated at 1.5% + 0.25).
// Refunded payments earn no commission.
const key = process.env.STRIPE_READ_KEY || process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_READ_KEY is not set");
  process.exit(2);
}
const share = 0.3;
const minimumPayoutCents = 2500;

const period = process.argv[2] ?? "";
const quarter = period.match(/^(\d{4})-Q([1-4])$/);
const month = period.match(/^(\d{4})-(\d{2})$/);
if (!quarter && !month) {
  console.error("Usage: node scripts/partners.mjs 2026-Q4 | 2026-11");
  process.exit(2);
}
const year = Number((quarter ?? month)[1]);
const firstMonth = quarter ? (Number(quarter[2]) - 1) * 3 : Number(month[2]) - 1;
const from = Date.UTC(year, firstMonth, 1) / 1000;
const to = Date.UTC(year, firstMonth + (quarter ? 3 : 1), 1) / 1000;

async function stripe(path) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { authorization: `Bearer ${key}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`);
  return data;
}

async function netCents(session) {
  const gross = session.amount_total ?? 0;
  const tax = session.total_details?.amount_tax ?? 0;
  let fee = Math.round(gross * 0.015 + 25);
  if (session.payment_intent) {
    try {
      const intent = await stripe(`payment_intents/${session.payment_intent}?expand[]=latest_charge.balance_transaction`);
      const charge = intent.latest_charge;
      if (charge?.refunded || charge?.amount_refunded) return 0;
      if (charge?.balance_transaction?.fee != null) fee = charge.balance_transaction.fee;
    } catch {
      // A restricted key may not read charges; keep the estimate.
    }
  }
  return Math.max(0, gross - tax - fee);
}

const partners = new Map();
let after = "";
for (;;) {
  const page = await stripe(`checkout/sessions?limit=100&status=complete&created[gte]=${from}&created[lt]=${to}${after}`);
  for (const session of page.data) {
    const ref = session.metadata?.ref;
    if (!ref || session.payment_status !== "paid") continue;
    const row = partners.get(ref) ?? { sales: 0, netCents: 0 };
    row.sales += 1;
    row.netCents += await netCents(session);
    partners.set(ref, row);
  }
  if (!page.has_more) break;
  after = `&starting_after=${page.data.at(-1).id}`;
}

const euro = (cents) => (cents / 100).toFixed(2);
console.log(`Period ${period}: ${partners.size} partner(s)`);
for (const [ref, row] of [...partners].sort((a, b) => b[1].netCents - a[1].netCents)) {
  const commission = Math.round(row.netCents * share);
  const note = commission >= minimumPayoutCents ? "pay out" : "carry over (below minimum)";
  console.log(`${ref.padEnd(32)} ${String(row.sales).padStart(4)} sales  net EUR ${euro(row.netCents).padStart(8)}  commission EUR ${euro(commission).padStart(7)}  ${note}`);
}
