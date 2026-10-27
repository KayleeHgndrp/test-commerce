import { site } from "@/lib/site";

// Sends an email through the Resend HTTP API. Without RESEND_API_KEY the
// message is logged instead, which is convenient during development.
export async function sendEmail(to: string, message: { subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] RESEND_API_KEY not set – would send "${message.subject}" to ${to}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? `${site.name} <reports@example.com>`,
      to: [to],
      reply_to: site.contactEmail,
      ...message,
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}
