import { brevoEnabled, listContacts } from "@/lib/brevo";
import { cronAuthorized } from "@/lib/cronAuth";
import { advance } from "@/lib/emailFlow";

// Daily job (vercel.json) that sends every follow-up email that is due. Vercel
// sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
// Brevo's free plan allows 300 emails a day; the result emails sent on sign-up
// count too, so the cron stays below that and picks up the rest tomorrow.
const DAILY_LIMIT = Number(process.env.EMAIL_FLOW_DAILY_LIMIT || 250);

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!brevoEnabled()) return Response.json({ error: "BREVO_API_KEY not set" }, { status: 500 });

  let sent = 0;
  let failed = 0;
  const now = Date.now();
  for await (const contact of listContacts()) {
    if (sent >= DAILY_LIMIT) break;
    try {
      if (await advance(contact, now)) sent++;
    } catch (error) {
      failed++;
      console.error(`[email-flow] ${contact.email}`, error);
    }
  }
  return Response.json({ sent, failed });
}
