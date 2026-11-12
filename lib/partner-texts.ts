import { fmt } from "@/lib/i18n/fmt";
import { locales } from "@/lib/i18n/locales";
import { formatPrice, site } from "@/lib/site";

import enTexts from "@/messages/en/partners.json";
import nlTexts from "@/messages/nl/partners.json";
import deTexts from "@/messages/de/partners.json";
import frTexts from "@/messages/fr/partners.json";
import esTexts from "@/messages/es/partners.json";
import itTexts from "@/messages/it/partners.json";
import ptTexts from "@/messages/pt/partners.json";
import plTexts from "@/messages/pl/partners.json";
import roTexts from "@/messages/ro/partners.json";
import csTexts from "@/messages/cs/partners.json";
import skTexts from "@/messages/sk/partners.json";
import huTexts from "@/messages/hu/partners.json";
import svTexts from "@/messages/sv/partners.json";
import daTexts from "@/messages/da/partners.json";
import fiTexts from "@/messages/fi/partners.json";
import etTexts from "@/messages/et/partners.json";
import lvTexts from "@/messages/lv/partners.json";
import ltTexts from "@/messages/lt/partners.json";
import elTexts from "@/messages/el/partners.json";
import bgTexts from "@/messages/bg/partners.json";
import hrTexts from "@/messages/hr/partners.json";
import slTexts from "@/messages/sl/partners.json";
import gaTexts from "@/messages/ga/partners.json";
import mtTexts from "@/messages/mt/partners.json";
import noTexts from "@/messages/no/partners.json";
import isTexts from "@/messages/is/partners.json";
import ukTexts from "@/messages/uk/partners.json";
import trTexts from "@/messages/tr/partners.json";
import srTexts from "@/messages/sr/partners.json";
import sqTexts from "@/messages/sq/partners.json";
import mkTexts from "@/messages/mk/partners.json";
import caTexts from "@/messages/ca/partners.json";

// Texts of the partner pages, portal and partner emails, one file per locale in
// messages/<locale>/partners.json (same keys as the English file).
type Texts = typeof enTexts;

const texts: Record<string, Texts> = {
  en: enTexts, nl: nlTexts, de: deTexts, fr: frTexts, es: esTexts, it: itTexts, pt: ptTexts, pl: plTexts, ro: roTexts, cs: csTexts, sk: skTexts, hu: huTexts, sv: svTexts, da: daTexts, fi: fiTexts, et: etTexts, lv: lvTexts, lt: ltTexts, el: elTexts, bg: bgTexts, hr: hrTexts, sl: slTexts, ga: gaTexts, mt: mtTexts, no: noTexts, is: isTexts, uk: ukTexts, tr: trTexts, sr: srTexts, sq: sqTexts, mk: mkTexts, ca: caTexts,
};

export const partnerLocales = locales;

// Rough net revenue of one report: price minus 21% VAT and Stripe's EU card fee.
const netReportCents = (site.priceCents / 1.21) - (site.priceCents * 0.015 + 25);

export const partnerVars = (locale: string) => ({
  share: `${Math.round(site.affiliateShare * 100)}%`,
  perSale: formatPrice(locale, Math.round(netReportCents * site.affiliateShare)),
  days: site.affiliateDays,
  minimum: formatPrice(locale, 2500),
  example: `${site.url.replace(/^https?:\/\//, "")}/${locale}?ref=yourname`,
  email: site.contactEmail,
  site: site.name,
});

export function partnerTexts(locale: string) {
  const t = texts[locale] ?? enTexts;
  const vars = partnerVars(locale);
  const f = (s: string) => fmt(s, vars);
  return {
    ...t,
    metaDescription: f(t.metaDescription),
    affiliateTitle: f(t.affiliateTitle),
    affiliatePoints: t.affiliatePoints.map(f),
    affiliateCta: f(t.affiliateCta),
    portal: { ...t.portal, blocked: f(t.portal.blocked) },
  };
}

export type PartnerTexts = ReturnType<typeof partnerTexts>;
export type PortalTexts = PartnerTexts["portal"];

// Emails are rendered on the server in the partner's own language.
export function partnerEmail(locale: string, kind: "welcome" | "login", vars: Record<string, string | number>) {
  const t = (texts[locale] ?? enTexts).emails;
  const all = { ...partnerVars(locale), ...vars };
  return {
    subject: fmt(kind === "welcome" ? t.welcomeSubject : t.loginSubject, all),
    text: fmt(kind === "welcome" ? t.welcomeBody : t.loginBody, all),
  };
}
