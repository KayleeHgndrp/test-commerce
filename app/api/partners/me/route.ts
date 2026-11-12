import { sessionFromRequest } from "@/lib/partner-auth";
import { partnerLink } from "@/lib/partner-portal";
import { getPartner, monthKey, referredSales, summarize } from "@/lib/partner-store";

// The logged-in partner's own figures. Sales show only date, product and
// commission: nothing about the buyer.
export async function GET(request: Request) {
  const id = sessionFromRequest(request);
  const partner = id ? await getPartner(id).catch(() => null) : null;
  if (!partner) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  if (partner.status !== "active") return Response.json({ blocked: true }, { headers: { "cache-control": "no-store" } });

  try {
    const sales = (await referredSales(partner.created)).filter((s) => s.ref === partner.ref && s.created >= partner.created);
    return Response.json(
      {
        name: partner.name,
        ref: partner.ref,
        locale: partner.locale,
        link: partnerLink(partner),
        clicksMonth: partner.clicks[monthKey()] ?? 0,
        clicksTotal: partner.clicks.t ?? 0,
        summary: summarize(partner, sales),
        sales: sales.slice(0, 25).map((s) => ({ date: s.created, plan: s.plan, cents: s.commissionCents })),
        payouts: partner.payouts,
        payoutDetailsSent: partner.payoutDetailsSent,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[partners] dashboard failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
