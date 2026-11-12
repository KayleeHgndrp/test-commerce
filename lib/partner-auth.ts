import crypto from "node:crypto";

// Signed, self-contained tokens for the partner portal. A partner logs in with a
// link we email them (valid for linkMinutes), which sets a session cookie
// (valid for sessionDays). Nothing is stored server side: the HMAC proves we
// issued the token, so it cannot be forged or edited.
//
// The key is PARTNER_SECRET when set, otherwise derived from STRIPE_SECRET_KEY so
// the portal works without extra setup. Rotating either key logs everyone out.

export const sessionCookie = "partner_session";
export const linkMinutes = 30;
export const sessionDays = 30;

type Kind = "link" | "session";
type Payload = { k: Kind; c: string; x: number };

function secret() {
  if (process.env.PARTNER_SECRET) return process.env.PARTNER_SECRET;
  if (process.env.STRIPE_SECRET_KEY) {
    return crypto.createHmac("sha256", process.env.STRIPE_SECRET_KEY).update("partner-portal-v1").digest("hex");
  }
  if (process.env.NODE_ENV !== "production") return "dev-only-partner-secret";
  throw new Error("PARTNER_SECRET or STRIPE_SECRET_KEY must be set");
}

const sign = (data: string) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

function issue(kind: Kind, customerId: string, seconds: number) {
  const payload: Payload = { k: kind, c: customerId, x: Math.floor(Date.now() / 1000) + seconds };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

function read(token: string | undefined | null, kind: Kind): string | null {
  if (!token || token.length > 500) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    if (payload.k !== kind || payload.x < Date.now() / 1000 || !/^cus_[A-Za-z0-9]+$/.test(payload.c)) return null;
    return payload.c;
  } catch {
    return null;
  }
}

export const issueLoginToken = (customerId: string) => issue("link", customerId, linkMinutes * 60);
export const readLoginToken = (token: string | null) => read(token, "link");
export const issueSession = (customerId: string) => issue("session", customerId, sessionDays * 86400);
export const readSession = (token: string | undefined) => read(token, "session");

// Reads the partner session from a request's Cookie header.
export function sessionFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
  return readSession(value ? decodeURIComponent(value) : undefined);
}

export function sessionCookieHeader(value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${sessionCookie}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

// Small per-instance rate limiter for public endpoints. Serverless instances do
// not share memory, so this only slows down abuse; it is not a hard limit.
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowSeconds: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowSeconds * 1000);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

export const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
