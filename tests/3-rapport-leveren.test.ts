import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as resend } from "@/app/api/admin/resend/route";
import { GET as passStatus, POST as unlockWithPass } from "@/app/api/pass/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { deliverOnce, retrievePaidOrder } from "@/lib/delivery";
import { allDefinitions } from "@/lib/i18n/messages";
import { scalePoints } from "@/lib/tests/scoring";
import { addPaidSession, answersFor, get, mailbox, post, stripe } from "./helpers/fakes";

// Flow 3: after paying, the customer gets the report by email. Stripe tells us
// through the webhook; the thank-you page delivers too in case the webhook is
// late. A paid order that never arrives is the worst thing that can go wrong.

const SECRET = "whsec_test_secret";
const def = (slug: string) => allDefinitions.find((d) => d.slug === slug)!;
const answers = (slug: string) => answersFor(def(slug).items.length, scalePoints[def(slug).scale], (i) => (i % 4) + 1);

function signed(event: unknown, secret = SECRET) {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return post("/api/stripe/webhook", payload, { "stripe-signature": `t=${t},v1=${sig}` });
}

const paidEvent = (session: unknown, type = "checkout.session.completed") => ({ type, data: { object: session } });

describe("rapport leveren na betaling", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
  });

  it("stuurt het rapport met PDF naar de koper na een geslaagde betaling", async () => {
    const session = addPaidSession({ slug: "attachment", locale: "nl", answers: answers("attachment"), plan: "single" });
    const res = await webhook(signed(paidEvent(session)));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(mailbox.sent).toHaveLength(1);
    const mail = mailbox.sent[0];
    expect(mail.to).toBe("buyer@example.com");
    expect(mail.attachments?.[0].content.subarray(0, 4).toString()).toBe("%PDF");
    expect(stripe.intents.get(String(session.payment_intent))!.metadata.report_sent).toBe("1");
  });

  it("stuurt nooit twee keer, ook niet als webhook en bedankpagina allebei leveren", async () => {
    const session = addPaidSession({ slug: "big-five", locale: "de", answers: answers("big-five") });
    await webhook(signed(paidEvent(session)));
    await webhook(signed(paidEvent(session)));
    await deliverOnce((await retrievePaidOrder(session.id))!); // the thank-you page
    expect(mailbox.sent).toHaveLength(1);
  });

  it("levert ook bij een betaling die later binnenkomt (bijvoorbeeld SEPA)", async () => {
    const session = addPaidSession({ slug: "disc", locale: "fr", answers: answers("disc") });
    await webhook(signed(paidEvent(session, "checkout.session.async_payment_succeeded")));
    expect(mailbox.sent).toHaveLength(1);
  });

  it("levert niets zolang er niet betaald is", async () => {
    const session = addPaidSession({ slug: "disc", locale: "fr", answers: answers("disc") }, { payment_status: "unpaid" });
    const res = await webhook(signed(paidEvent(session)));
    expect(await res.text()).toBe("not paid or invalid metadata");
    expect(mailbox.sent).toHaveLength(0);
  });

  it("weigert nepberichten die niet van Stripe komen", async () => {
    const session = addPaidSession({ slug: "disc", locale: "fr", answers: answers("disc") });
    expect((await webhook(signed(paidEvent(session), "whsec_fout"))).status).toBe(400);
    expect((await webhook(post("/api/stripe/webhook", paidEvent(session)))).status).toBe(400);
    expect(mailbox.sent).toHaveLength(0);
  });

  it("als de mail mislukt: eigenaar krijgt een waarschuwing en een nieuwe poging blijft mogelijk", async () => {
    const session = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five") });
    mailbox.failNext = true;
    await expect(webhook(signed(paidEvent(session)))).rejects.toThrow("SMTP down");
    expect(mailbox.sent.some((m) => m.subject.includes("NOT delivered") && m.text.includes(session.id))).toBe(true);
    expect(stripe.intents.get(String(session.payment_intent))!.metadata.report_sent).toBe("");
    // Stripe retries the webhook: now it goes through.
    mailbox.sent = [];
    await webhook(signed(paidEvent(session)));
    expect(mailbox.sent.map((m) => m.to)).toEqual(["buyer@example.com"]);
  });

  it("pakket van 3: rapport plus link om nog 2 rapporten te openen", async () => {
    const session = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five"), plan: "pack" }, { amount_total: 495 });
    await webhook(signed(paidEvent(session)));
    expect(mailbox.sent[0].text).toContain(`/nl/pass?id=${session.id}`);

    const status = await (await passStatus(get(`/api/pass?id=${session.id}`))).json();
    expect(status).toMatchObject({ plan: "pack", remaining: 2 });

    const open = (slug: string) => unlockWithPass(post("/api/pass", { pass: session.id, slug, locale: "nl", answers: answers(slug) }));
    expect((await open("disc")).status).toBe(200);
    expect((await open("enneagram")).status).toBe(200);
    expect((await open("disc")).status).toBe(200); // already unlocked, no credit used
    const full = await open("hsp");
    expect(full.status).toBe(409);
    expect(await full.json()).toEqual({ error: "no_credits" });
    // Report email for the pack itself plus one per newly unlocked test.
    expect(mailbox.sent).toHaveLength(3);
  });

  it("alles-pas: opent het rapport van elke test", async () => {
    const session = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five"), plan: "all" }, { amount_total: 1495 });
    await webhook(signed(paidEvent(session)));
    const others = allDefinitions.filter((d) => d.slug !== "big-five");
    for (const d of others) {
      const res = await unlockWithPass(post("/api/pass", { pass: session.id, slug: d.slug, locale: "nl", answers: answers(d.slug) }));
      expect(res.status, d.slug).toBe(200);
    }
    const status = await (await passStatus(get(`/api/pass?id=${session.id}`))).json();
    expect(status.remaining).toBe(0);
  });

  it("een gewoon rapport (single) opent geen andere tests", async () => {
    const session = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five"), plan: "single" });
    const res = await unlockWithPass(post("/api/pass", { pass: session.id, slug: "disc", locale: "nl", answers: answers("disc") }));
    expect(res.status).toBe(404);
  });

  it("relatie-rapport: vergelijkt beide partners", async () => {
    const session = addPaidSession({
      slug: "love-style", locale: "nl", answers: answers("love-style"), plan: "couple",
      partner_answers: answersFor(def("love-style").items.length, 5, () => 5), partner_name: "Sam",
    }, { amount_total: 595 });
    await webhook(signed(paidEvent(session)));
    expect(mailbox.sent).toHaveLength(1);
    expect(mailbox.sent[0].text).toContain("Sam");
  });

  it("beheerder kan een rapport opnieuw sturen, alleen met de juiste sleutel", async () => {
    vi.stubEnv("ADMIN_TOKEN", "admin-token-1234567890");
    const session = addPaidSession({ slug: "big-five", locale: "nl", answers: answers("big-five") });
    const call = (token: string) => resend(post("/api/admin/resend", { sessionId: session.id, email: "ander@example.com" }, { authorization: `Bearer ${token}` }));
    expect((await call("fout")).status).toBe(401);
    expect(mailbox.sent).toHaveLength(0);
    expect(await (await call("admin-token-1234567890")).json()).toEqual({ ok: true, sentTo: "ander@example.com" });
    expect(mailbox.sent[0].to).toBe("ander@example.com");
  });
});
