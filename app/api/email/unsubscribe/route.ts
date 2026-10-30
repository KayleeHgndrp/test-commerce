import { brevoEnabled, updateContact } from "@/lib/brevo";
import { validUnsubscribeToken } from "@/lib/emailFlow";
import { defaultLocale, hasLocale, toLangTag } from "@/lib/i18n/locales";
import { getEmailMessages } from "@/lib/i18n/messages";
import { site } from "@/lib/site";

// Unsubscribe link in every flow email. GET shows a confirm button, because
// mail scanners open links on their own; POST unsubscribes, which also serves
// the one-click List-Unsubscribe header.
async function page(url: URL, state: "confirm" | "done" | "invalid") {
  const l = url.searchParams.get("l") ?? "";
  const locale = hasLocale(l) ? l : defaultLocale;
  const m = (await getEmailMessages(locale)).unsubscribePage;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const body =
    state === "confirm"
      ? `<p>${esc(m.text)}</p><form method="post"><button style="background:#6246ea;color:#fff;border:0;border-radius:10px;padding:14px 24px;font:inherit;font-weight:bold;cursor:pointer">${esc(m.button)}</button></form>`
      : `<p>${esc(state === "done" ? m.done : m.invalid)}</p><p><a href="${site.url}/${locale}" style="color:#6246ea">${esc(site.name)}</a></p>`;
  const html = `<!doctype html><html lang="${toLangTag(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(m.title)} | ${esc(site.name)}</title></head><body style="margin:0;background:#f7f6f2;font-family:Manrope,Arial,sans-serif;color:#17152b"><main style="max-width:480px;margin:12vh auto;padding:32px;background:#fff;border-radius:16px;line-height:1.6"><h1 style="margin-top:0;font-size:24px">${esc(m.title)}</h1>${body}</main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

const params = (url: URL) => ({ email: url.searchParams.get("e") ?? "", token: url.searchParams.get("t") ?? "" });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { email, token } = params(url);
  return page(url, email && validUnsubscribeToken(email, token) ? "confirm" : "invalid");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const { email, token } = params(url);
  if (!email || !validUnsubscribeToken(email, token)) return page(url, "invalid");
  try {
    if (brevoEnabled()) await updateContact(email, { emailBlacklisted: true });
  } catch (error) {
    console.error("[unsubscribe] failed", error);
    return page(url, "invalid");
  }
  return page(url, "done");
}
