import { authorizedAdmin } from "@/lib/admin";
import { partnerLink } from "@/lib/partner-portal";
import { allPartners, getPartner, monthKey, recordPayout, referredSales, summarize, updatePartner } from "@/lib/partner-store";

// Admin overview of all partners for the payout round, used by /nl/partners/admin.
//   GET  -> every partner with clicks, sales, commission and what is payable
//   POST {id, action: "paid", period, cents}   records a bank transfer you made
//   POST {id, action: "block" | "unblock"}     ends or restores a partnership
export async function GET(request: Request) {
  if (!authorizedAdmin(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const partners = await allPartners();
  const since = Math.min(...partners.map((p) => p.created), Math.floor(Date.now() / 1000));
  const sales = await referredSales(since);
  const known = new Set(partners.map((p) => p.ref));
  return Response.json(
    {
      partners: partners.map((p) => ({
        id: p.id,
        ref: p.ref,
        name: p.name,
        email: p.email,
        site: p.site,
        locale: p.locale,
        created: p.created,
        verified: p.verified,
        status: p.status,
        link: partnerLink(p),
        clicksMonth: p.clicks[monthKey()] ?? 0,
        clicksTotal: p.clicks.t ?? 0,
        payouts: p.payouts,
        payoutDetailsSent: p.payoutDetailsSent,
        summary: summarize(p, sales),
      })),
      // Sales with a ref that no signed-up partner owns (for example an old hand-made link).
      unclaimed: sales.filter((s) => !known.has(s.ref)).map((s) => ({ ref: s.ref, date: s.created, cents: s.commissionCents })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!authorizedAdmin(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const partner = typeof body?.id === "string" && /^cus_[A-Za-z0-9]+$/.test(body.id) ? await getPartner(body.id) : null;
  if (!partner) return Response.json({ error: "not_found" }, { status: 404 });

  if (body?.action === "paid") {
    const cents = Number(body.cents);
    const period = typeof body.period === "string" && /^\d{4}-Q[1-4]$/.test(body.period) ? body.period : null;
    if (!period || !Number.isInteger(cents) || cents <= 0 || cents > 10_000_000) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    await recordPayout(partner, period, cents);
    return Response.json({ ok: true });
  }
  if (body?.action === "block" || body?.action === "unblock") {
    await updatePartner(partner.id, { partner_status: body.action === "block" ? "blocked" : "active" });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "invalid_request" }, { status: 400 });
}
