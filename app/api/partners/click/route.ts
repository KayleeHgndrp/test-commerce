import { clientIp, rateLimited } from "@/lib/partner-auth";
import { recordClick } from "@/lib/partner-store";
import { refPattern } from "@/lib/partners";

// Counts a visit that arrived through a partner link. The browser calls this once
// per visit; no cookie or personal data is involved, only a counter per month.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { ref?: unknown } | null;
  const ref = typeof body?.ref === "string" ? body.ref.toLowerCase() : "";
  if (!refPattern.test(ref)) return new Response(null, { status: 204 });
  // One click per visitor and partner per 30 minutes, and a cap per instance.
  if (rateLimited(`click:${clientIp(request)}:${ref}`, 1, 1800) || rateLimited("click:all", 120, 60)) {
    return new Response(null, { status: 204 });
  }
  await recordClick(ref).catch((error) => console.error("[partners] click failed", error));
  return new Response(null, { status: 204 });
}
