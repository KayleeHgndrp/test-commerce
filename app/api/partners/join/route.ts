import { sendEmail } from "@/lib/email";
import { clientIp, rateLimited } from "@/lib/partner-auth";
import { clean, emailPattern, partnerLink, portalLocale, sendLoginEmail } from "@/lib/partner-portal";
import { createPartner, findByEmail, findByRef, releaseStale, reservedRefs } from "@/lib/partner-store";
import { refPattern } from "@/lib/partners";
import { site } from "@/lib/site";

// Self sign-up: claims a ref and emails a login link that confirms the address.
// The ref stays reserved for 48 hours; if the link is never opened it is released.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (clean(body?.website, 200)) return Response.json({ ok: true }); // honeypot
  if (rateLimited(`join:${clientIp(request)}`, 5, 3600)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const name = clean(body?.name, 80);
  const email = clean(body?.email, 254).toLowerCase();
  const profile = clean(body?.site, 200);
  const ref = clean(body?.ref, 32).toLowerCase();
  const locale = portalLocale(body?.locale);
  if (!refPattern.test(ref) || reservedRefs.has(ref)) return Response.json({ error: "ref_invalid" }, { status: 400 });
  if (!name || !profile || !emailPattern.test(email) || body?.agree !== true) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    // Someone who is already a partner gets a login link instead of a second account.
    const existing = await findByEmail(email);
    if (existing) {
      await sendLoginEmail(existing, "login");
      return Response.json({ ok: true });
    }
    if (await findByRef(ref)) return Response.json({ error: "ref_taken" }, { status: 409 });

    await releaseStale(ref, email);
    const partner = await createPartner({ email, ref, name, site: profile, locale });
    await sendLoginEmail(partner, "welcome");
    await sendEmail(site.contactEmail, {
      subject: `[${site.name}] Nieuwe partner: ${ref}`,
      text: `Naam: ${name}\nE-mail: ${email}\nWebsite/profiel: ${profile}\nTaal: ${locale}\nLink: ${partnerLink(partner)}\n\nDe partner is actief zodra de bevestigingslink is geopend. Beheer: ${site.url}/nl/partners/admin`,
      replyTo: email,
    }).catch((error) => console.error("[partners] owner notification failed", error));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[partners] join failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
