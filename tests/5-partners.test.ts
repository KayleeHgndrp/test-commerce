import { beforeEach, describe, expect, it, vi } from "vitest";
import { addPaidSession, get, mailbox, post, stripe } from "./helpers/fakes";

// Flow 5: partners sign up, confirm their email, share their link and earn 50%
// of the net revenue of every sale through that link. Partners are stored in
// Stripe, so this runs against the fake Stripe.

// Fresh copies of the routes per test: they keep small caches in memory.
async function routes() {
  vi.resetModules();
  return {
    join: (await import("@/app/api/partners/join/route")).POST,
    auth: (await import("@/app/api/partners/auth/route")).GET,
    me: (await import("@/app/api/partners/me/route")).GET,
    click: (await import("@/app/api/partners/click/route")).POST,
    login: (await import("@/app/api/partners/login/route")).POST,
    admin: (await import("@/app/api/admin/partners/route")),
    store: await import("@/lib/partner-store"),
  };
}

const signupBody = (extra: Record<string, unknown> = {}) => ({
  name: "Lisa",
  email: "Lisa@Example.com",
  site: "https://instagram.com/lisa",
  ref: "lisa",
  locale: "nl",
  agree: true,
  ...extra,
});

// Signs up, opens the link from the email and returns the session cookie.
async function signUpAndLogIn(r: Awaited<ReturnType<typeof routes>>, extra: Record<string, unknown> = {}) {
  expect((await r.join(post("/api/partners/join", signupBody(extra)))).status).toBe(200);
  const welcome = mailbox.sent.find((m) => m.to === String(extra.email ?? "lisa@example.com"))!;
  const link = welcome.text.match(/https?:\/\/\S+\/api\/partners\/auth\?token=[^\s"<]+/)![0];
  const res = await r.auth(get(link.replace(/^https?:\/\/[^/]+/, "")));
  expect(res.status).toBe(303);
  expect(res.headers.get("location")).toMatch(/\/nl\/partners\/dashboard$/);
  return res.headers.get("set-cookie")!.split(";")[0];
}

describe("partnerprogramma", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    vi.stubEnv("ADMIN_TOKEN", "admin-token-1234567890");
  });

  it("aanmelden: partner aangemaakt, welkomstmail met inloglink, melding naar ons", async () => {
    const r = await routes();
    const res = await r.join(post("/api/partners/join", signupBody()));
    expect(res.status).toBe(200);
    const [customer] = [...stripe.customers.values()];
    expect(customer.email).toBe("lisa@example.com");
    expect(customer.metadata).toMatchObject({ partner: "1", partner_ref: "lisa", partner_locale: "nl", partner_status: "active", partner_verified: "" });
    const welcome = mailbox.sent.find((m) => m.to === "lisa@example.com")!;
    expect(welcome.text).toContain("/api/partners/auth?token=");
    expect(welcome.text).toContain("?ref=lisa");
    expect(mailbox.sent.some((m) => m.subject.includes("Nieuwe partner: lisa"))).toBe(true);
  });

  it("weigert bezette, gereserveerde en ongeldige namen, en aanmelden zonder akkoord", async () => {
    const r = await routes();
    await r.join(post("/api/partners/join", signupBody()));
    const taken = await r.join(post("/api/partners/join", signupBody({ email: "ander@example.com" })));
    expect(taken.status).toBe(409);
    expect((await r.join(post("/api/partners/join", signupBody({ email: "x@example.com", ref: "admin" })))).status).toBe(400);
    expect((await r.join(post("/api/partners/join", signupBody({ email: "y@example.com", ref: "Met Spatie" })))).status).toBe(400);
    expect((await r.join(post("/api/partners/join", signupBody({ email: "z@example.com", ref: "zeta", agree: false })))).status).toBe(400);
    expect(stripe.customers.size).toBe(1);
  });

  it("wie al partner is en zich opnieuw aanmeldt, krijgt een inloglink en geen tweede account", async () => {
    const r = await routes();
    await r.join(post("/api/partners/join", signupBody()));
    await r.join(post("/api/partners/join", signupBody({ ref: "lisa2" })));
    expect(stripe.customers.size).toBe(1);
    expect(mailbox.sent.filter((m) => m.to === "lisa@example.com")).toHaveLength(2);
  });

  it("de inloglink bevestigt het adres; een vervalste link werkt niet", async () => {
    const r = await routes();
    const cookie = await signUpAndLogIn(r);
    expect([...stripe.customers.values()][0].metadata.partner_verified).toBe("1");
    expect((await r.me(get("/api/partners/me", { cookie }))).status).toBe(200);
    const forged = await r.auth(get("/api/partners/auth?token=eyJrIjoibGluayJ9.vals"));
    expect(forged.headers.get("location")).toContain("/partners/join?expired=1");
    expect((await r.me(get("/api/partners/me", { cookie: "partner_session=vals" }))).status).toBe(401);
  });

  it("dashboard: 50% van de netto-opbrengst van verkopen via de eigen link", async () => {
    const r = await routes();
    const cookie = await signUpAndLogIn(r);
    const answers = "3".repeat(100);
    // Before sign-up: not theirs.
    addPaidSession({ slug: "big-five", locale: "nl", answers, ref: "lisa" }, { created: Math.floor(Date.now() / 1000) - 86400 * 30 });
    // Through her link: one report and one all-access pass, VAT included.
    const single = addPaidSession({ slug: "big-five", locale: "nl", answers, ref: "lisa", plan: "single" }, { created: Math.floor(Date.now() / 1000) + 5, amount_total: 199, total_details: { amount_tax: 35 } });
    addPaidSession({ slug: "big-five", locale: "nl", answers, ref: "lisa", plan: "all" }, { created: Math.floor(Date.now() / 1000) + 6, amount_total: 1495, total_details: { amount_tax: 259 } });
    // Someone else's sale and an unreferred sale.
    addPaidSession({ slug: "big-five", locale: "nl", answers, ref: "iemand" }, { created: Math.floor(Date.now() / 1000) + 7 });
    addPaidSession({ slug: "big-five", locale: "nl", answers }, { created: Math.floor(Date.now() / 1000) + 8 });
    // Stripe's real fee on the first sale is known.
    Object.assign(stripe.intents.get(String(single.payment_intent))!, { latest_charge: { balance_transaction: { fee: 28 } } });

    const me = await (await r.me(get("/api/partners/me", { cookie }))).json();
    // single: 199 - 35 VAT - 28 fee = 136 net -> 68 commission
    // all: 1495 - 259 VAT - estimated fee (1.5% + 25 = 47) = 1189 net -> 595 (rounded)
    expect(me.summary.sales).toBe(2);
    expect(me.sales.map((s: { cents: number }) => s.cents).sort((a: number, b: number) => a - b)).toEqual([68, 595]);
    expect(me.summary.earnedCents).toBe(68 + 595);
    expect(me.link).toBe("http://localhost:3000/nl?ref=lisa");
  });

  it("terugbetaalde verkopen leveren geen commissie op", async () => {
    const r = await routes();
    const cookie = await signUpAndLogIn(r);
    const sale = addPaidSession({ slug: "big-five", locale: "nl", answers: "3".repeat(100), ref: "lisa" }, { created: Math.floor(Date.now() / 1000) + 5 });
    Object.assign(stripe.intents.get(String(sale.payment_intent))!, { latest_charge: { refunded: true } });
    const me = await (await r.me(get("/api/partners/me", { cookie }))).json();
    expect(me.summary.earnedCents).toBe(0);
  });

  it("uitbetalen: alleen afgesloten kwartalen en vanaf €25", async () => {
    const { summarize, quarterOf } = await routes().then((r) => r.store);
    const partner = { id: "cus_1", email: "", ref: "lisa", name: "", site: "", locale: "nl", created: 0, verified: true, status: "active" as const, clicks: {}, payouts: [], payoutDetailsSent: "" };
    const now = Date.now() / 1000;
    const lastQuarter = now - 100 * 86400;
    const sale = (created: number, cents: number) => ({ ref: "lisa", created, plan: "single", netCents: cents * 2, commissionCents: cents, quarter: quarterOf(created) });

    const small = summarize(partner, [sale(lastQuarter, 2000), sale(now, 5000)]);
    expect(small).toMatchObject({ earnedCents: 7000, currentQuarterCents: 5000, payableCents: 2000, due: false });
    const enough = summarize(partner, [sale(lastQuarter, 2600)]);
    expect(enough).toMatchObject({ payableCents: 2600, due: true });
    const paid = summarize({ ...partner, payouts: [{ period: quarterOf(lastQuarter), cents: 2600, date: "2027-01-05" }] }, [sale(lastQuarter, 2600)]);
    expect(paid).toMatchObject({ paidCents: 2600, payableCents: 0, due: false });
    // Sales of another partner never count.
    expect(summarize(partner, [{ ...sale(lastQuarter, 9999), ref: "ander" }]).earnedCents).toBe(0);
  });

  it("klikken op de partnerlink worden geteld (alleen na bevestiging)", async () => {
    const r = await routes();
    await r.join(post("/api/partners/join", signupBody()));
    await r.click(post("/api/partners/click", { ref: "lisa" }, { "x-forwarded-for": "1.1.1.1" }));
    expect([...stripe.customers.values()][0].metadata.partner_clicks).toBeUndefined();

    const r2 = await routes();
    await r2.auth(get(`/api/partners/auth?token=${(await import("@/lib/partner-auth")).issueLoginToken([...stripe.customers.keys()][0])}`));
    await r2.click(post("/api/partners/click", { ref: "lisa" }, { "x-forwarded-for": "2.2.2.2" }));
    await r2.click(post("/api/partners/click", { ref: "lisa" }, { "x-forwarded-for": "3.3.3.3" }));
    await r2.click(post("/api/partners/click", { ref: "lisa" }, { "x-forwarded-for": "3.3.3.3" })); // same visitor again
    expect(JSON.parse([...stripe.customers.values()][0].metadata.partner_clicks).t).toBe(2);
  });

  it("beheerpagina: alleen met sleutel; uitbetaling en blokkeren worden opgeslagen", async () => {
    const r = await routes();
    await signUpAndLogIn(r);
    const id = [...stripe.customers.keys()][0];
    const auth = { authorization: "Bearer admin-token-1234567890" };
    expect((await r.admin.GET(get("/api/admin/partners"))).status).toBe(401);
    const list = await (await r.admin.GET(get("/api/admin/partners", auth))).json();
    expect(list.partners.map((p: { ref: string }) => p.ref)).toEqual(["lisa"]);

    expect((await r.admin.POST(post("/api/admin/partners", { id, action: "paid", period: "2026-Q4", cents: 2600 }, auth))).status).toBe(200);
    expect(JSON.parse(stripe.customers.get(id)!.metadata.partner_paid)[0].slice(0, 2)).toEqual(["2026-Q4", 2600]);
    await r.admin.POST(post("/api/admin/partners", { id, action: "block" }, auth));
    expect(stripe.customers.get(id)!.metadata.partner_status).toBe("blocked");
  });
});
