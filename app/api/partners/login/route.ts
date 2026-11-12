import { clientIp, rateLimited } from "@/lib/partner-auth";
import { clean, emailPattern, sendLoginEmail } from "@/lib/partner-portal";
import { findByEmail } from "@/lib/partner-store";

// Sends a login link. The answer is the same whether or not the address is a
// partner, so the form cannot be used to find out who our partners are.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = clean(body?.email, 254).toLowerCase();
  if (!emailPattern.test(email)) return Response.json({ error: "invalid_request" }, { status: 400 });
  if (rateLimited(`login:${clientIp(request)}`, 10, 3600) || rateLimited(`login:${email}`, 3, 900)) {
    return Response.json({ ok: true });
  }
  try {
    const partner = await findByEmail(email);
    if (partner && partner.status === "active") await sendLoginEmail(partner, "login");
  } catch (error) {
    console.error("[partners] login link failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
