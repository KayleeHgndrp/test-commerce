import { fmt } from "@/lib/i18n/fmt";
import { formatPrice, site } from "@/lib/site";

// The partner pages address coaches and creators, who we contact in English
// and Dutch. Other locales show the English text and are not indexed.
const texts = {
  en: {
    title: "Partners",
    metaDescription: "Recommend our free tests and earn {share} on every report bought through your link.",
    intro: "Coaches, therapists, teachers and writers use our free tests with the people they work with. Your audience takes the tests for free, and when someone buys a report through your link, you earn half.",
    affiliateTitle: "Share your link, earn {share}",
    affiliatePoints: [
      "You get {share} of the net revenue (excluding VAT and payment fees) of every report bought through your link, about {perSale} per report.",
      "A visit counts for {days} days, as long as the visitor accepted cookies; otherwise it counts during that visit.",
      "We pay out every quarter once you have earned {minimum} or more, by bank transfer.",
      "Your link looks like {example}. It works on any page and any test.",
    ],
    affiliateCta: "Email {email} with your website or profile and the name you would like in your link. We reply within a few days.",
    termsTitle: "Fair play",
    terms: [
      "Mention that you earn a commission, for example with \"affiliate link\" or #ad.",
      "Our tests are for self-reflection, not diagnosis. Please do not present them as a medical or psychological assessment.",
      "No ads on our brand name, no spam and no misleading claims.",
      "We may end a partnership that breaks these rules. Commission on refunded orders is not paid.",
    ],
  },
  nl: {
    title: "Partners",
    metaDescription: "Raad onze gratis tests aan en verdien {share} op elk rapport dat via jouw link wordt gekocht.",
    intro: "Coaches, therapeuten, docenten en schrijvers gebruiken onze gratis tests met de mensen met wie ze werken. Je publiek doet de tests gratis, en koopt iemand via jouw link een rapport, dan verdien jij de helft.",
    affiliateTitle: "Deel je link en verdien {share}",
    affiliatePoints: [
      "Je krijgt {share} van de netto-omzet (zonder btw en betaalkosten) van elk rapport dat via jouw link wordt gekocht, ongeveer {perSale} per rapport.",
      "Een bezoek telt {days} dagen mee als de bezoeker cookies accepteert, anders tijdens dat bezoek.",
      "We betalen elk kwartaal uit zodra je {minimum} of meer hebt verdiend, per bankoverschrijving.",
      "Je link ziet eruit als {example}. Hij werkt op elke pagina en bij elke test.",
    ],
    affiliateCta: "Mail naar {email} met je website of profiel en de naam die je in je link wilt. We reageren binnen een paar dagen.",
    termsTitle: "Spelregels",
    terms: [
      "Vermeld dat je commissie verdient, bijvoorbeeld met \"affiliate link\" of #ad.",
      "Onze tests zijn bedoeld voor zelfreflectie, niet voor een diagnose. Presenteer ze dus niet als medisch of psychologisch onderzoek.",
      "Geen advertenties op onze merknaam, geen spam en geen misleidende claims.",
      "We kunnen een samenwerking beëindigen die deze regels breekt. Over terugbetaalde bestellingen betalen we geen commissie.",
    ],
  },
};

export const partnerLocales = ["en", "nl"] as const;

// Rough net revenue of one report: price minus 21% VAT and Stripe's EU card fee.
const netReportCents = (site.priceCents / 1.21) - (site.priceCents * 0.015 + 25);

export function partnerTexts(locale: string) {
  const t = locale === "nl" ? texts.nl : texts.en;
  const vars = {
    share: `${Math.round(site.affiliateShare * 100)}%`,
    perSale: formatPrice(locale, Math.round(netReportCents * site.affiliateShare)),
    days: site.affiliateDays,
    minimum: formatPrice(locale, 2500),
    example: `${site.url.replace(/^https?:\/\//, "")}/${locale}?ref=yourname`,
    email: site.contactEmail,
  };
  const f = (s: string) => fmt(s, vars);
  return {
    ...t,
    metaDescription: f(t.metaDescription),
    affiliateTitle: f(t.affiliateTitle),
    affiliatePoints: t.affiliatePoints.map(f),
    affiliateCta: f(t.affiliateCta),
  };
}

export type PartnerTexts = ReturnType<typeof partnerTexts>;
