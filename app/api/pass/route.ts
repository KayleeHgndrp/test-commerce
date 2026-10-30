import { redeemPass, retrievePass } from "@/lib/delivery";
import { sendEmail } from "@/lib/email";
import { hasLocale } from "@/lib/i18n/locales";
import { getDefinition } from "@/lib/i18n/messages";
import { renderReport } from "@/lib/report/render";
import { decodeAnswers } from "@/lib/tests/scoring";

// Status of a pack or all-access pass, for the result page.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const pass = await retrievePass(id).catch(() => null);
  if (!pass) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ plan: pass.order.plan, covered: pass.covered, remaining: pass.remaining });
}

// Unlocks the report of another test with a credit of the pass and emails it
// to the address the pass was bought with.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, string> | null;
  const { pass: id, slug, locale, answers } = body ?? {};
  const def = typeof slug === "string" ? getDefinition(slug) : undefined;
  const decoded = def && typeof answers === "string" ? decodeAnswers(def, answers) : null;
  if (!def || !decoded || typeof locale !== "string" || !hasLocale(locale) || typeof id !== "string") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const pass = await retrievePass(id).catch(() => null);
  if (!pass) return Response.json({ error: "not_found" }, { status: 404 });
  const isNew = !pass.covered.includes(slug);
  if (!(await redeemPass(pass, slug))) return Response.json({ error: "no_credits" }, { status: 409 });
  // Only a new unlock sends mail, so the endpoint cannot be used to spam the buyer.
  // The report is also shown on the thanks page, so a mail failure is logged, not fatal.
  if (isNew) {
    await sendEmail(pass.order.email, await renderReport(locale, slug, decoded)).catch((error) =>
      console.error("[pass] could not email report", error),
    );
  }

  const origin = new URL(request.url).origin;
  return Response.json({ url: `${origin}/${locale}/${slug}/thanks?pass=${id}&answers=${answers}`, remaining: pass.remaining });
}
