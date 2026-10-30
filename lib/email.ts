import nodemailer, { type Transporter } from "nodemailer";
import { site } from "@/lib/site";

type Message = {
  subject: string;
  html?: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
};

let transport: Transporter | undefined;

function getTransport() {
  if (!process.env.SMTP_HOST) return undefined;
  const port = Number(process.env.SMTP_PORT || 587);
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Port 465 uses implicit TLS; other ports upgrade with STARTTLS.
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}

// Accepts both "user@host" and "Name <user@host>" so a display name in the env
// var cannot produce a malformed From header (which mail servers reject).
export const fromAddress = () => {
  const raw = process.env.CONTACT_FROM_EMAIL || site.contactEmail;
  return raw.match(/<([^>]+)>/)?.[1].trim() ?? raw.trim();
};

// Sends an email over SMTP (SMTP_HOST/PORT/USER/PASS). Without SMTP_HOST the
// message is logged instead, which is convenient during development.
export async function sendEmail(to: string, message: Message) {
  const smtp = getTransport();
  if (!smtp) {
    console.log(`[email] SMTP_HOST not set – would send "${message.subject}" to ${to}`);
    return;
  }
  await smtp.sendMail({
    from: { name: site.name, address: fromAddress() },
    to,
    replyTo: message.replyTo ?? site.contactEmail,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments,
  });
}
