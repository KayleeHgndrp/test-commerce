import { fmt } from "@/lib/i18n/fmt";
import { formatPrice, site } from "@/lib/site";

// The partner pages address coaches and creators, who we contact in English
// and Dutch. Other locales show the English text and are not indexed.
const texts = {
  en: {
    title: "Partners",
    metaDescription: "Earn {share} on every report bought through your link, or give your clients a full report with prepaid codes.",
    intro: "Coaches, therapists, teachers and writers use our free tests with the people they work with. There are two ways to work with us.",
    affiliateTitle: "Share your link, earn {share}",
    affiliatePoints: [
      "You get {share} of the net revenue (excluding VAT and payment fees) of every report bought through your link, about {perSale} per report.",
      "A visit counts for {days} days, as long as the visitor accepted cookies; otherwise it counts during that visit.",
      "We pay out every quarter once you have earned {minimum} or more, by bank transfer.",
      "Your link looks like {example}. It works on any page and any test.",
    ],
    affiliateCta: "Email {email} with your website or profile and the name you would like in your link. We reply within a few days.",
    packTitle: "Coach pack: {size} full reports for {price}",
    packText: "Give clients a full report without asking them to pay. You get {size} personal links by email; each unlocks one full report for any test and works once. That is {each} per report instead of {full}.",
    packEmail: "Email address for your codes",
    packButton: "Buy the coach pack for {price}",
    packNote: "Secure payment via Stripe. One-time payment, codes do not expire.",
    termsTitle: "Fair play",
    terms: [
      "Mention that you earn a commission, for example with \"affiliate link\" or #ad.",
      "Our tests are for self-reflection, not diagnosis. Please do not present them as a medical or psychological assessment.",
      "No ads on our brand name, no spam and no misleading claims.",
      "We may end a partnership that breaks these rules. Commission on refunded orders is not paid.",
    ],
    codesTitle: "Your report codes",
    codesText: "We also sent these links to {email}. Each one unlocks one full report and works once.",
    codesMissing: "We could not find a paid coach pack for this link. If you just paid, refresh the page in a minute or email {email}.",
    error: "Something went wrong. Please try again.",
    invalidEmail: "Please enter a valid email address.",
  },
  nl: {
    title: "Partners",
    metaDescription: "Verdien {share} op elk rapport dat via jouw link wordt gekocht, of geef je cliënten een volledig rapport met vooraf betaalde codes.",
    intro: "Coaches, therapeuten, docenten en schrijvers gebruiken onze gratis tests met de mensen met wie ze werken. Je kunt op twee manieren met ons samenwerken.",
    affiliateTitle: "Deel je link en verdien {share}",
    affiliatePoints: [
      "Je krijgt {share} van de netto-omzet (zonder btw en betaalkosten) van elk rapport dat via jouw link wordt gekocht, ongeveer {perSale} per rapport.",
      "Een bezoek telt {days} dagen mee als de bezoeker cookies accepteert, anders tijdens dat bezoek.",
      "We betalen elk kwartaal uit zodra je {minimum} of meer hebt verdiend, per bankoverschrijving.",
      "Je link ziet eruit als {example}. Hij werkt op elke pagina en bij elke test.",
    ],
    affiliateCta: "Mail naar {email} met je website of profiel en de naam die je in je link wilt. We reageren binnen een paar dagen.",
    packTitle: "Coachpakket: {size} volledige rapporten voor {price}",
    packText: "Geef cliënten een volledig rapport zonder dat ze hoeven te betalen. Je krijgt {size} persoonlijke links per mail; elke link geeft één volledig rapport voor een test naar keuze en werkt één keer. Dat is {each} per rapport in plaats van {full}.",
    packEmail: "E-mailadres voor je codes",
    packButton: "Koop het coachpakket voor {price}",
    packNote: "Veilig betalen via Stripe. Eenmalige betaling, codes verlopen niet.",
    termsTitle: "Spelregels",
    terms: [
      "Vermeld dat je commissie verdient, bijvoorbeeld met \"affiliate link\" of #ad.",
      "Onze tests zijn bedoeld voor zelfreflectie, niet voor een diagnose. Presenteer ze dus niet als medisch of psychologisch onderzoek.",
      "Geen advertenties op onze merknaam, geen spam en geen misleidende claims.",
      "We kunnen een samenwerking beëindigen die deze regels breekt. Over terugbetaalde bestellingen betalen we geen commissie.",
    ],
    codesTitle: "Je rapportcodes",
    codesText: "We hebben deze links ook naar {email} gestuurd. Elke link geeft één volledig rapport en werkt één keer.",
    codesMissing: "We konden geen betaald coachpakket vinden voor deze link. Heb je net betaald? Ververs de pagina over een minuut of mail naar {email}.",
    error: "Er ging iets mis. Probeer het opnieuw.",
    invalidEmail: "Vul een geldig e-mailadres in.",
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
    size: site.coachPackSize,
    price: formatPrice(locale, site.coachPackCents),
    each: formatPrice(locale, Math.round(site.coachPackCents / site.coachPackSize)),
    full: formatPrice(locale),
  };
  const f = (s: string) => fmt(s, vars);
  return {
    ...t,
    metaDescription: f(t.metaDescription),
    affiliateTitle: f(t.affiliateTitle),
    affiliatePoints: t.affiliatePoints.map(f),
    affiliateCta: f(t.affiliateCta),
    packTitle: f(t.packTitle),
    packText: f(t.packText),
    packButton: f(t.packButton),
    codesMissing: f(t.codesMissing),
  };
}

export type PartnerTexts = ReturnType<typeof partnerTexts>;
