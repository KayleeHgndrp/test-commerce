import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResultPage from "@/app/[locale]/[test]/result/page";
import { GET as cron } from "@/app/api/cron/email-flow/route";
import { GET as unsubscribePage, POST as unsubscribe } from "@/app/api/email/unsubscribe/route";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as subscribe } from "@/app/api/subscribe/route";
import { deliverOnce, retrievePaidOrder } from "@/lib/delivery";
import { emailFlowAllowed, unsubscribeToken } from "@/lib/emailFlow";
import { locales } from "@/lib/i18n/locales";
import { allDefinitions, getEmailMessages } from "@/lib/i18n/messages";
import { offerToken, offerUntil, validOffer } from "@/lib/offer";
import { scalePoints } from "@/lib/tests/scoring";
import { addPaidSession, answersFor, brevo, get, outsideCalls, post, stripe } from "./helpers/fakes";

// Flow 4: the free "email me my result" box on the result page and the follow-up
// emails through Brevo (day 0, 2, 4, 6 with a lower-price offer, 8 when the offer
// ends; buyers get a shorter track).

const def = (slug: string) => allDefinitions.find((d) => d.slug === slug)!;
const answers = (slug: string) => answersFor(def(slug).items.length, scalePoints[def(slug).scale], (i) => (i % 5) + 1);
const DAY = 86400000;
const CRON = "cron-secret-1234567890";

const signup = (slug: string, extra: Record<string, unknown> = {}) =>
  subscribe(post("/api/subscribe", { slug, locale: "nl", email: "lezer@example.com", answers: answers(slug), gender: "female", consent: true, ...extra }));

const runCron = () => cron(get("/api/cron/email-flow", { authorization: `Bearer ${CRON}` }));

async function resultPageOptin(slug: string) {
  const page = await ResultPage({ params: Promise.resolve({ locale: "nl", test: slug }) } as never);
  return (page as { props: { optin: unknown } }).props.optin;
}

describe("e-mailflow", () => {
  beforeEach(() => {
    vi.stubEnv("BREVO_API_KEY", "xkeysib-fake");
    vi.stubEnv("BREVO_SENDER_EMAIL", "hallo@personalityreveal.com");
    vi.stubEnv("CRON_SECRET", CRON);
  });

  describe("het blok op de resultaatpagina", () => {
    it("staat er bij gewone tests", async () => {
      expect(await resultPageOptin("big-five")).toBeTruthy();
      expect(await resultPageOptin("attachment")).toBeTruthy();
    });

    it("staat er bewust niet bij de depressie-, ADHD-, politieke en andere gezondheidstests", async () => {
      for (const d of allDefinitions.filter((d) => d.category === "screeners" || d.outcome === "political")) {
        expect(await resultPageOptin(d.slug), d.slug).toBeNull();
        expect(emailFlowAllowed(d)).toBe(false);
      }
      expect(await resultPageOptin("depression")).toBeNull();
      expect(await resultPageOptin("adhd")).toBeNull();
      expect(await resultPageOptin("political")).toBeNull();
    });

    it("verschijnt alleen als BREVO_API_KEY er was toen de site gebouwd werd", async () => {
      vi.stubEnv("BREVO_API_KEY", "");
      expect(await resultPageOptin("big-five")).toBeNull();
    });

    it("heeft teksten in alle 32 talen, zonder gedachtestreepjes", async () => {
      for (const locale of locales) {
        const m = await getEmailMessages(locale);
        for (const key of ["title", "text", "button", "consent", "done"] as const) {
          expect(m.optin[key], `${locale} optin.${key}`).toBeTruthy();
        }
        for (const step of ["offer", "offerEnds"] as const) {
          for (const key of ["subject", "intro", "outro", "cta"] as const) {
            expect(m[step][key], `${locale} ${step}.${key}`).toBeTruthy();
          }
          expect(m[step].intro, `${locale} ${step}.intro`).toContain("{date}");
          expect(m[step].intro, `${locale} ${step}.intro`).toContain("{full}");
          expect(m[step].subject + m[step].intro, `${locale} ${step}`).toContain("{price}");
        }
        for (const ph of ["{price}", "{full}", "{date}"]) expect(m.offerBanner, `${locale} offerBanner`).toContain(ph);
        expect(JSON.stringify(m), locale).not.toMatch(/\u2014/);
      }
    });
  });

  it("inschrijven: lijst in Brevo, contact erin en direct een mail met de uitslag", async () => {
    const res = await signup("big-five");
    expect(res.status).toBe(200);
    // The very first sign-up creates the list and the contact fields in Brevo.
    expect(brevo.lists.map((l) => l.name)).toEqual(["Personality Reveal"]);
    expect(brevo.attributes).toEqual(new Set(["LOCALE", "TEST", "ANSWERS", "GENDER", "CONSENT_AT", "FLOW_START", "FLOW_STEP", "PURCHASED_AT", "PLAN", "OFFER_UNTIL"]));
    const contact = brevo.contacts.get("lezer@example.com")!;
    expect(contact.attributes).toMatchObject({ LOCALE: "nl", TEST: "big-five", ANSWERS: answers("big-five"), FLOW_STEP: 1 });
    expect(contact.attributes.CONSENT_AT).toBeTruthy();
    expect(brevo.emails).toHaveLength(1);
    const mail = brevo.emails[0];
    expect(mail.to).toEqual([{ email: "lezer@example.com" }]);
    expect(mail.sender.email).toBe("hallo@personalityreveal.com");
    expect(mail.tags).toEqual(["flow-result"]);
    expect(mail.headers["List-Unsubscribe"]).toContain("/api/email/unsubscribe?");
    expect(mail.htmlContent).toContain("/nl/big-five/result?r=");
    expect(mail.htmlContent + mail.textContent + mail.subject).not.toMatch(/\u2014/);
    expect(outsideCalls).toEqual([]);
  });

  it("zonder vinkje: alleen de gevraagde uitslag per mail, adres niet op de lijst en geen vervolgmails", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const start = new Date("2026-11-16T09:00:00Z").getTime();
      vi.setSystemTime(start);
      expect((await signup("big-five", { consent: false })).status).toBe(200);
      expect(brevo.contacts.size).toBe(0);
      expect(brevo.emails.map((m) => m.tags[0])).toEqual(["flow-result"]);
      for (const day of [2, 4, 6, 8]) {
        vi.setSystemTime(start + day * DAY);
        await runCron();
      }
      expect(brevo.emails).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("weigert met fout adres en bij gevoelige tests", async () => {
    expect((await signup("big-five", { email: "geen-adres" })).status).toBe(400);
    for (const slug of ["depression", "adhd", "political"]) {
      expect((await signup(slug)).status, slug).toBe(400);
    }
    expect(brevo.contacts.size).toBe(0);
    expect(brevo.emails).toHaveLength(0);
  });

  it("spambots (verborgen veld ingevuld) krijgen 'ok' maar er gebeurt niets", async () => {
    expect((await signup("big-five", { website: "spam.example" })).status).toBe(200);
    expect(brevo.contacts.size).toBe(0);
  });

  it("op productie zonder Brevo-sleutel: foutmelding in plaats van stil niets doen", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await signup("big-five")).status).toBe(500);
  });

  it("vervolgmails komen op dag 2, 4, 6 (aanbod) en 8 (laatste dag) en daarna niet meer", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const start = new Date("2026-11-16T09:00:00Z").getTime();
      vi.setSystemTime(start);
      await signup("attachment");
      const tagsOn = async (day: number) => {
        vi.setSystemTime(start + day * DAY);
        const before = brevo.emails.length;
        const res = await runCron();
        expect(res.status).toBe(200);
        return brevo.emails.slice(before).map((m) => m.tags[0]);
      };
      expect(await tagsOn(1)).toEqual([]);
      expect(await tagsOn(2)).toEqual(["flow-insight"]);
      expect(await tagsOn(3)).toEqual([]);
      expect(await tagsOn(4)).toEqual(["flow-nextTest"]);
      expect(await tagsOn(5)).toEqual([]);
      expect(await tagsOn(6)).toEqual(["flow-offer"]);
      expect(await tagsOn(7)).toEqual([]);
      expect(await tagsOn(8)).toEqual(["flow-offerEnds"]);
      expect(await tagsOn(9)).toEqual([]);
      expect(await tagsOn(30)).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("de dagelijkse taak werkt alleen met de geheime sleutel", async () => {
    expect((await cron(get("/api/cron/email-flow"))).status).toBe(401);
    expect((await cron(get("/api/cron/email-flow", { authorization: "Bearer fout" }))).status).toBe(401);
  });

  it("wie koopt krijgt geen 'laatste kans'-mail maar het kopersspoor, met alles-pas-aanbod op dag 5", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const start = new Date("2026-11-16T09:00:00Z").getTime();
      vi.setSystemTime(start);
      await signup("love-style", { email: "buyer@example.com" });
      const session = addPaidSession({ slug: "love-style", locale: "nl", answers: answers("love-style"), plan: "single" });
      await deliverOnce((await retrievePaidOrder(session.id))!);
      expect(brevo.contacts.get("buyer@example.com")!.attributes).toMatchObject({ FLOW_STEP: 2, PLAN: "single" });

      const sent: string[] = [];
      for (const day of [1, 2, 3, 4, 5, 6, 7, 8]) {
        vi.setSystemTime(start + day * DAY);
        const before = brevo.emails.length;
        await runCron();
        sent.push(...brevo.emails.slice(before).map((m) => `dag ${day}: ${m.tags[0]}`));
      }
      expect(sent).toEqual(["dag 2: flow-nextTest", "dag 5: flow-pass"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("wie de alles-pas al heeft, krijgt het alles-pas-aanbod niet", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const start = new Date("2026-11-16T09:00:00Z").getTime();
      vi.setSystemTime(start);
      const session = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five"), plan: "all", newsletter: "1" });
      await deliverOnce((await retrievePaidOrder(session.id))!);
      for (const day of [2, 5, 7]) {
        vi.setSystemTime(start + day * DAY);
        await runCron();
      }
      expect(brevo.emails.map((m) => m.tags[0])).toEqual(["flow-nextTest"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("kopers die niet ingeschreven zijn krijgen geen marketingmail", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    const session = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five") });
    await deliverOnce((await retrievePaidOrder(session.id))!);
    expect(brevo.contacts.size).toBe(0);
  });

  it("uitschrijven werkt met de link uit de mail, en niet met een verzonnen link", async () => {
    await signup("big-five");
    const token = unsubscribeToken("lezer@example.com");
    const url = (t: string) => `/api/email/unsubscribe?e=lezer%40example.com&t=${t}&l=nl`;
    expect(await (await unsubscribePage(get(url(token)))).text()).toContain("<form");
    await unsubscribe(post(url("verzonnen"), ""));
    expect(brevo.contacts.get("lezer@example.com")!.emailBlacklisted).toBe(false);
    await unsubscribe(post(url(token), ""));
    expect(brevo.contacts.get("lezer@example.com")!.emailBlacklisted).toBe(true);

    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(Date.now() + 3 * DAY);
      const before = brevo.emails.length;
      await runCron();
      expect(brevo.emails.length).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
  describe("het aanbod in de vervolgmails", () => {
    const START = new Date("2026-11-16T09:00:00Z").getTime();

    // Signs up, runs the daily job up to the offer email and returns that email.
    async function offerMail(slug = "attachment") {
      vi.setSystemTime(START);
      await signup(slug);
      for (const day of [2, 4, 6]) {
        vi.setSystemTime(START + day * DAY);
        await runCron();
      }
      const mail = brevo.emails.find((m) => m.tags[0] === "flow-offer")!;
      const token = /[?&]offer=([\w.-]+)/.exec(mail.textContent)![1];
      return { mail, token };
    }

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("noemt de actieprijs, de normale prijs en de einddatum, en linkt naar de rapportpagina met aanbod", async () => {
      const { mail, token } = await offerMail();
      expect(mail.subject).toMatch(/€\s1,49$/);
      expect(mail.textContent).toMatch(/€\s1,49 in plaats van €\s1,99/);
      // Sent on Sunday 22 Nov, valid through Tuesday 24 Nov; the last email goes out that morning.
      expect(mail.textContent).toContain("dinsdag 24 november");
      expect(mail.textContent).toMatch(/\/nl\/attachment\/result\?r=[^\s]+&offer=/);
      expect(brevo.contacts.get("lezer@example.com")!.attributes.OFFER_UNTIL).toBe("2026-11-24T23:59:59.000Z");
      expect(validOffer("attachment", token)).toBe(true);
      expect(mail.htmlContent + mail.textContent + mail.subject).not.toMatch(/\u2014/);

      vi.setSystemTime(START + 8 * DAY);
      await runCron();
      const last = brevo.emails.at(-1)!;
      expect(last.tags).toEqual(["flow-offerEnds"]);
      expect(last.subject).toMatch(/^Laatste dag/);
      expect(last.textContent).toContain("dinsdag 24 november");
      expect(last.textContent).toContain(`offer=${token}`);
    });

    it("de link geeft bij afrekenen het rapport voor €1,49, alleen voor die test en alleen voor één rapport", async () => {
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
      const { token } = await offerMail();
      const buy = async (slug: string, extra: Record<string, unknown>) => {
        const res = await checkout(post("/api/checkout", { slug, locale: "nl", answers: answers(slug), gender: "female", offer: token, ...extra }));
        expect(res.status).toBe(200);
        return stripe.calls.findLast((c) => c.path === "checkout/sessions" && c.method === "POST")!.params;
      };
      let session = await buy("attachment", { plan: "single" });
      expect(session["line_items[0][price_data][unit_amount]"]).toBe("149");
      expect(session["metadata[offer]"]).toBe("email");
      expect(session.cancel_url).toBe(`https://personalityreveal.test/nl/attachment/result?offer=${token}`);
      // Another test, the pack or the pass: normal prices.
      session = await buy("big-five", { plan: "single" });
      expect(session["line_items[0][price_data][unit_amount]"]).toBe("199");
      expect(session["metadata[offer]"]).toBeUndefined();
      session = await buy("attachment", { plan: "pack" });
      expect(session["line_items[0][price_data][unit_amount]"]).toBe("495");
      session = await buy("attachment", { plan: "all" });
      expect(session["line_items[0][price_data][unit_amount]"]).toBe("1495");
    });

    it("na de einddatum, of met een aangepaste link, geldt weer de normale prijs", async () => {
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
      const { token } = await offerMail();
      const until = Date.parse("2026-11-24T23:59:59Z");
      // 12 hours of grace for time zones west of UTC.
      expect(validOffer("attachment", token, until + 11 * 3600000)).toBe(true);
      expect(validOffer("attachment", token, until + 13 * 3600000)).toBe(false);
      const [expires, sig] = token.split(".");
      expect(validOffer("attachment", `${Number(expires) + 86400}.${sig}`)).toBe(false);
      expect(validOffer("attachment", "kapot")).toBe(false);
      expect(validOffer("attachment", undefined)).toBe(false);

      vi.setSystemTime(until + DAY);
      await checkout(post("/api/checkout", { slug: "attachment", locale: "nl", answers: answers("attachment"), gender: "female", offer: token }));
      expect(stripe.calls.findLast((c) => c.path === "checkout/sessions")!.params["line_items[0][price_data][unit_amount]"]).toBe("199");
    });

    it("stuurt de 'laatste dag'-mail niet als die door een gemiste dag pas na de einddatum zou komen", async () => {
      await offerMail();
      const before = brevo.emails.length;
      vi.setSystemTime(START + 10 * DAY);
      await runCron();
      expect(brevo.emails.length).toBe(before);
      expect(brevo.contacts.get("lezer@example.com")!.attributes.FLOW_STEP).toBe(5);
    });

    it("wie na het aanbod koopt, krijgt geen 'laatste dag'-mail maar het kopersspoor", async () => {
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
      await offerMail();
      vi.setSystemTime(START + 7 * DAY);
      const session = addPaidSession({ slug: "attachment", locale: "nl", answers: answers("attachment"), plan: "single", offer: "email" }, { amount_total: 149, customer_details: { email: "lezer@example.com" } });
      await deliverOnce((await retrievePaidOrder(session.id))!);
      const before = brevo.emails.length;
      vi.setSystemTime(START + 8 * DAY);
      await runCron();
      expect(brevo.emails.slice(before).map((m) => m.tags[0])).toEqual([]);
      vi.setSystemTime(START + 9 * DAY);
      await runCron();
      expect(brevo.emails.slice(before).map((m) => m.tags[0])).toEqual(["flow-nextTest"]);
    });

    it("de einddatum valt aan het eind van de dag, twee dagen na de aanbodmail", () => {
      expect(new Date(offerUntil(Date.parse("2026-11-22T08:00:00Z"))).toISOString()).toBe("2026-11-24T23:59:59.000Z");
      expect(offerToken("x", offerUntil(0))).toMatch(/^\d+\.[\w-]{16}$/);
    });
  });
});
