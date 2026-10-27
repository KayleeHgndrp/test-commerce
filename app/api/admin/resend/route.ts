import crypto from "node:crypto";
import { retrievePaidOrder } from "@/lib/delivery";
import { sendEmail } from "@/lib/email";
import { renderReport } from "@/lib/report/render";

// Support tool: resend a paid report, optionally to another address.
//   curl -X POST https://<domain>/api/admin/resend \
//     -H "authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
//     -d '{"sessionId":"cs_live_…","email":"optional@override.com"}'
// The Checkout Session id is shown on the payment in the Stripe dashboard.
function authorized(request: Request) {
  const token = process.env.ADMIN_TOKEN;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token || token.length < 16) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { sessionId?: string; email?: string } | null;
  const order = body?.sessionId ? await retrievePaidOrder(body.sessionId) : null;
  if (!order) return Response.json({ error: "no paid session found" }, { status: 404 });

  const to = body?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ? body.email : order.email;
  await sendEmail(to, await renderReport(order.locale, order.slug, order.answers));
  return Response.json({ ok: true, sentTo: to });
}
