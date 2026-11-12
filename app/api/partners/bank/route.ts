import { sendEmail } from "@/lib/email";
import { rateLimited, sessionFromRequest } from "@/lib/partner-auth";
import { clean, validIban } from "@/lib/partner-portal";
import { getPartner, updatePartner } from "@/lib/partner-store";
import { site } from "@/lib/site";

// Bank details go to our inbox by email and are not stored: Stripe advises
// against keeping account numbers in metadata. Only the date is kept.
export async function POST(request: Request) {
  const id = sessionFromRequest(request);
  const partner = id ? await getPartner(id).catch(() => null) : null;
  if (!partner || partner.status !== "active") return Response.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(`bank:${partner.id}`, 5, 3600)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const holder = clean(body?.holder, 100);
  const iban = validIban(clean(body?.iban, 50));
  if (!holder || !iban) return Response.json({ error: "iban_invalid" }, { status: 400 });

  try {
    await sendEmail(site.contactEmail, {
      subject: `[${site.name}] Bankgegevens partner ${partner.ref}`,
      text: `Partner: ${partner.name} (?ref=${partner.ref})\nE-mail: ${partner.email}\nRekeninghouder: ${holder}\nIBAN: ${iban}\n\nBewaar deze gegevens voor de kwartaaluitbetaling. Ze staan niet op de website.`,
      replyTo: partner.email,
    });
    const date = new Date().toISOString().slice(0, 10);
    await updatePartner(partner.id, { partner_payout: date });
    return Response.json({ ok: true, date });
  } catch (error) {
    console.error("[partners] bank details failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
