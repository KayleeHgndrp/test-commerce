import { issueSession, readLoginToken, sessionCookieHeader, sessionDays } from "@/lib/partner-auth";
import { getPartner, updatePartner } from "@/lib/partner-store";
import { site } from "@/lib/site";

// Opened from the email: turns a valid login link into a session cookie. The
// first time, this also confirms the email address and activates the link.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const id = readLoginToken(token);
  const partner = id ? await getPartner(id).catch(() => null) : null;
  if (!partner || partner.status !== "active") {
    return Response.redirect(`${site.url}/${partner?.locale ?? "en"}/partners/join?expired=1`, 303);
  }
  if (!partner.verified) await updatePartner(partner.id, { partner_verified: "1" }).catch(() => null);

  return new Response(null, {
    status: 303,
    headers: {
      location: `${site.url}/${partner.locale}/partners/dashboard`,
      "set-cookie": sessionCookieHeader(issueSession(partner.id), sessionDays * 86400),
      "cache-control": "no-store",
    },
  });
}
