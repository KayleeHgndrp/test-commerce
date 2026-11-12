import { sendEmail } from "@/lib/email";
import { hasLocale } from "@/lib/i18n/locales";
import { issueLoginToken, linkMinutes } from "@/lib/partner-auth";
import type { Partner } from "@/lib/partner-store";
import { partnerEmail } from "@/lib/partner-texts";
import { site } from "@/lib/site";

export const emailPattern = /^[^\s@"'\\]+@[^\s@"'\\]+\.[^\s@"'\\]+$/;

export const portalLocale = (value: unknown) => (typeof value === "string" && hasLocale(value) ? value : "en");

export const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max) : "";

export const partnerLink = (partner: Pick<Partner, "ref" | "locale">) => `${site.url}/${partner.locale}?ref=${partner.ref}`;

// Links in emails always use the configured site URL, never the request's Host header.
export async function sendLoginEmail(partner: Partner, kind: "welcome" | "login") {
  const login = `${site.url}/api/partners/auth?token=${issueLoginToken(partner.id)}`;
  const message = partnerEmail(partner.locale, kind, {
    name: partner.name,
    link: partnerLink(partner),
    login,
    minutes: linkMinutes,
  });
  await sendEmail(partner.email, message);
}

// IBAN check digits (ISO 13616, mod 97).
export function validIban(value: string) {
  const iban = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return null;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1 ? iban.replace(/(.{4})/g, "$1 ").trim() : null;
}
