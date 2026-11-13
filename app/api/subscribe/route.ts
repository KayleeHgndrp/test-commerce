import { emailFlowAllowed, subscribe } from "@/lib/emailFlow";
import { brevoEnabled } from "@/lib/brevo";
import { hasLocale } from "@/lib/i18n/locales";
import { getDefinition } from "@/lib/i18n/messages";
import { decodeAnswers } from "@/lib/tests/scoring";

// Opt-in from the result page: "email me my result" plus the follow-up flow.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { slug, locale, email, answers, gender, website } = (body ?? {}) as Record<string, string>;
  // Bots fill in the hidden "website" field; pretend it worked.
  if (website) return Response.json({ ok: true });

  const def = typeof slug === "string" ? getDefinition(slug) : undefined;
  const decoded = def && typeof answers === "string" ? decodeAnswers(def, answers) : null;
  const validEmail = typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!def || !decoded || !validEmail || body?.consent !== true || typeof locale !== "string" || !hasLocale(locale) || !emailFlowAllowed(def)) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!brevoEnabled() && process.env.NODE_ENV === "production") {
    return Response.json({ error: "email_not_configured" }, { status: 500 });
  }

  try {
    await subscribe({ email: email.trim(), locale, def, answers: decoded, gender: ["male", "female", "other"].includes(gender) ? gender : "other" });
  } catch (error) {
    console.error("[subscribe] failed", error);
    return Response.json({ error: "failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
