import crypto from "node:crypto";

// Admin endpoints accept `Authorization: Bearer $ADMIN_TOKEN` (at least 16 characters).
export function authorizedAdmin(request: Request) {
  const token = process.env.ADMIN_TOKEN;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token || token.length < 16) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
