import crypto from "node:crypto";

// Vercel cron jobs send "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
export function cronAuthorized(request: Request) {
  const token = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token || token.length < 16) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
