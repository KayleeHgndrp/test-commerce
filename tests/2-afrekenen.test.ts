import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as checkout } from "@/app/api/checkout/route";
import { allDefinitions } from "@/lib/i18n/messages";
import { site } from "@/lib/site";
import { scalePoints } from "@/lib/tests/scoring";
import { addPaidSession, answersFor, mailbox, outsideCalls, post, stripe } from "./helpers/fakes";

// Flow 2: the buy button sends the visitor to Stripe with the right product and
// price, and with everything needed to deliver the report afterwards.

const def = (slug: string) => allDefinitions.find((d) => d.slug === slug)!;
const answers = (slug: string) => answersFor(def(slug).items.length, scalePoints[def(slug).scale], (i) => (i % 3) + 1);

const order = (slug: string, extra: Record<string, unknown> = {}) => ({
  slug,
  locale: "nl",
  answers: answers(slug),
  gender: "female",
  email: "koper@example.com",
  ...extra,
});

async function buy(body: Record<string, unknown>) {
  const res = await checkout(post("/api/checkout", body));
  return { status: res.status, body: await res.json(), session: stripe.calls.findLast((c) => c.path === "checkout/sessions" && c.method === "POST")?.params };
}

describe("afrekenen via Stripe", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
  });

  it.each([
    ["single", "big-five", 199, "rapport €1,99"],
    ["pack", "big-five", 495, "pakket van 3 €4,95"],
    ["all", "big-five", 1495, "alles-pas €14,95"],
  ])("plan %s rekent het juiste bedrag af (%s, %i cent, %s)", async (plan, slug, cents) => {
    const { status, body, session } = await buy(order(slug, { plan }));
    expect(status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.test/pay");
    expect(session!["line_items[0][price_data][unit_amount]"]).toBe(String(cents));
    expect(session!["line_items[0][price_data][currency]"]).toBe("eur");
    expect(session!["line_items[0][price_data][tax_behavior]"]).toBe("inclusive");
    expect(session!.mode).toBe("payment");
    expect(session!["metadata[plan]"]).toBe(plan);
    expect(session!["metadata[slug]"]).toBe(slug);
    expect(session!["metadata[answers]"]).toBe(answers(slug));
    expect(session!.customer_email).toBe("koper@example.com");
    expect(session!.success_url).toBe("https://personalityreveal.test/nl/big-five/thanks?session_id={CHECKOUT_SESSION_ID}");
    expect(session!.cancel_url).toBe("https://personalityreveal.test/nl/big-five/result");
  });

  it("de prijzen in de code zijn de prijzen die we adverteren", () => {
    expect(site.priceCents).toBe(199);
    expect(site.listPriceCents).toBe(325);
    expect(site.packPriceCents).toBe(495);
    expect(site.packSize).toBe(3);
    expect(site.allPriceCents).toBe(1495);
    expect(site.couplePriceCents).toBe(595);
  });

  it("relatie-rapport kost €5,95 en neemt de antwoorden van de partner mee", async () => {
    const { status, session } = await buy(order("attachment", { plan: "couple", partnerAnswers: answers("attachment"), partnerName: "Sam <script>" }));
    expect(status).toBe(200);
    expect(session!["line_items[0][price_data][unit_amount]"]).toBe("595");
    expect(session!["metadata[partner_answers]"]).toBe(answers("attachment"));
    expect(session!["metadata[partner_name]"]).toBe("Sam script");
  });

  it("relatie-rapport kan alleen bij hechting, liefdestaal en big five", async () => {
    const { status } = await buy(order("disc", { plan: "couple", partnerAnswers: answers("disc") }));
    expect(status).toBe(400);
  });

  it("werkt in elke taal en zonder e-mailadres (Stripe vraagt het dan zelf)", async () => {
    const { status, session } = await buy(order("enneagram", { locale: "ga", email: "" }));
    expect(status).toBe(200);
    expect(session!.customer_email).toBeUndefined();
    expect(session!.locale).toBe("auto");
  });

  it("weigert kapotte bestellingen zonder Stripe te bellen", async () => {
    for (const bad of [
      order("big-five", { slug: "bestaat-niet" }),
      order("big-five", { answers: "123" }),
      order("big-five", { locale: "xx" }),
      order("big-five", { email: "geen-mail" }),
    ]) {
      expect((await buy(bad)).status).toBe(400);
    }
    expect(stripe.calls).toHaveLength(0);
  });

  it("geeft de partnercode mee zodat de partner zijn 50% krijgt", async () => {
    const { session } = await buy(order("big-five", { ref: "lisa-blog" }));
    expect(session!["metadata[ref]"]).toBe("lisa-blog");
    const bad = await buy(order("big-five", { ref: "Niet Geldig!" }));
    expect(bad.status).toBe(200);
    expect(bad.session!["metadata[ref]"]).toBeUndefined();
  });

  it("nieuwsbrief-vinkje gaat alleen mee bij tests waarvoor mail mag", async () => {
    const ok = await buy(order("big-five", { newsletter: true }));
    expect(ok.session!["metadata[newsletter]"]).toBe("1");
    for (const slug of ["depression", "adhd", "political"]) {
      const { status, session } = await buy(order(slug, { newsletter: true }));
      expect(status).toBe(200);
      expect(session!["metadata[newsletter]"], slug).toBeUndefined();
    }
  });

  it("upgrade naar alles-pas kost het verschil en houdt de partner", async () => {
    const first = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five"), plan: "single", ref: "lisa-blog" }, { amount_total: 199 });
    const { status, session } = await buy(order("big-five", { plan: "all", upgradeFrom: first.id, ref: "iemand-anders" }));
    expect(status).toBe(200);
    expect(session!["line_items[0][price_data][unit_amount]"]).toBe(String(1495 - 199));
    expect(session!["metadata[ref]"]).toBe("lisa-blog");
    expect(session!["metadata[upgrade_from]"]).toBe(first.id);
    expect(session!.customer_email).toBe("buyer@example.com");
  });

  it("upgrade kan niet na 7 dagen of op een andere test", async () => {
    const old = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five"), plan: "single" }, { created: Math.floor(Date.now() / 1000) - 8 * 86400 });
    expect((await buy(order("big-five", { plan: "all", upgradeFrom: old.id }))).status).toBe(400);
    const recent = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five"), plan: "single" });
    expect((await buy(order("disc", { plan: "all", upgradeFrom: recent.id }))).status).toBe(400);
  });

  it("zonder Stripe-sleutel op productie: duidelijke fout, geen gratis rapport", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    const { status, body } = await buy(order("big-five"));
    expect(status).toBe(500);
    expect(body.error).toBe("payments_not_configured");
    expect(mailbox.sent).toHaveLength(0);
  });

  it("praat alleen met Stripe, nergens anders mee", async () => {
    await buy(order("big-five"));
    expect(outsideCalls).toEqual([]);
  });
});
