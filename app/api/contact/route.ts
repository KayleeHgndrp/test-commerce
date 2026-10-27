import { sendEmail } from "@/lib/email";
import { site } from "@/lib/site";

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = clean(body?.name, 100);
  const email = clean(body?.email, 254);
  const message = clean(body?.message, 5000);

  // Honeypot: bots fill in the hidden "website" field; pretend success.
  if (clean(body?.website, 200)) return Response.json({ ok: true });
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(name + email)) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    await sendEmail(site.contactEmail, {
      subject: `[${site.name}] Contact: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nLanguage: ${clean(body?.locale, 5)}\n\n${message}`,
      replyTo: email,
    });
  } catch (error) {
    console.error("[contact] send failed", error);
    return Response.json({ error: "send_failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
