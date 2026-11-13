import { vi } from "vitest";

// In-memory stand-ins for Stripe and Brevo. The app talks to them through the
// global fetch, so replacing fetch is enough to run every flow offline. Any call
// to another host fails the test, which guarantees no real request goes out.

export type SentMail = { to: string; subject: string; text: string; html?: string; attachments?: { filename: string; content: Buffer }[] };
export const mailbox = { sent: [] as SentMail[], failNext: false };

type Obj = Record<string, unknown> & { id: string; metadata: Record<string, string> };

export const stripe = {
  calls: [] as { method: string; path: string; params: Record<string, string> }[],
  sessions: new Map<string, Obj>(),
  intents: new Map<string, Obj>(),
  customers: new Map<string, Obj & { email: string | null; created: number }>(),
};

export const brevo = {
  calls: [] as { method: string; path: string; body: unknown }[],
  contacts: new Map<string, { email: string; emailBlacklisted: boolean; attributes: Record<string, unknown>; listIds: number[] }>(),
  attributes: new Set<string>(),
  lists: [] as { id: number; name: string }[],
  emails: [] as { sender: { email: string; name: string }; to: { email: string }[]; subject: string; htmlContent: string; textContent: string; tags: string[]; headers: Record<string, string> }[],
};

export const outsideCalls: string[] = [];

let counter = 0;
const nextId = (prefix: string) => `${prefix}_test${++counter}`;

// Turns Stripe's flat form fields (metadata[slug]=x) into nested metadata.
function metadataFrom(params: Record<string, string>) {
  const meta: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const m = key.match(/^metadata\[(.+)\]$/);
    if (m) meta[m[1]] = value;
  }
  return meta;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// A paid Checkout Session as Stripe would report it after a successful payment.
export function addPaidSession(metadata: Record<string, string>, extra: Partial<Obj> = {}) {
  const intent: Obj = { id: nextId("pi"), metadata: {} };
  stripe.intents.set(intent.id, intent);
  const session: Obj = {
    id: nextId("cs"),
    created: Math.floor(Date.now() / 1000),
    amount_total: 199,
    payment_status: "paid",
    status: "complete",
    payment_intent: intent.id,
    customer_email: null,
    customer_details: { email: "buyer@example.com" },
    total_details: { amount_tax: 0 },
    ...extra,
    metadata,
  };
  stripe.sessions.set(session.id, session);
  return session;
}

function stripeHandler(method: string, url: URL, params: Record<string, string>) {
  const path = url.pathname.replace(/^\/v1\//, "");
  stripe.calls.push({ method, path: path + url.search, params });

  if (path === "checkout/sessions" && method === "POST") {
    const session: Obj = {
      id: nextId("cs"),
      created: Math.floor(Date.now() / 1000),
      url: "https://checkout.stripe.test/pay",
      payment_status: "unpaid",
      payment_intent: null,
      customer_email: params.customer_email ?? null,
      amount_total: Number(params["line_items[0][price_data][unit_amount]"]),
      metadata: metadataFrom(params),
    };
    stripe.sessions.set(session.id, session);
    return json(session);
  }
  if (path === "checkout/sessions" && method === "GET") {
    const since = Number(url.searchParams.get("created[gte]") ?? 0);
    const data = [...stripe.sessions.values()].filter((s) => s.status === "complete" && Number(s.created) >= since);
    return json({ data, has_more: false });
  }
  let m = path.match(/^checkout\/sessions\/(.+)$/);
  if (m) {
    const s = stripe.sessions.get(m[1]);
    return s ? json(s) : json({ error: { message: "No such session" } }, 404);
  }
  m = path.match(/^payment_intents\/([^/?]+)$/);
  if (m) {
    const intent = stripe.intents.get(m[1]);
    if (!intent) return json({ error: { message: "No such payment_intent" } }, 404);
    if (method === "POST") Object.assign(intent.metadata, metadataFrom(params));
    return json(intent);
  }
  if (path === "customers" && method === "POST") {
    const customer = { id: nextId("cus"), email: params.email ?? null, created: Math.floor(Date.now() / 1000), metadata: metadataFrom(params) };
    stripe.customers.set(customer.id, customer);
    return json(customer);
  }
  if (path === "customers/search") {
    const query = url.searchParams.get("query") ?? "";
    const byRef = query.match(/metadata\['partner_ref'\]:'(.+)'/)?.[1];
    const byEmail = query.match(/^email:'(.+)'$/)?.[1];
    const data = [...stripe.customers.values()].filter((c) =>
      byRef ? c.metadata.partner_ref === byRef : byEmail ? c.email === byEmail : c.metadata.partner === "1",
    );
    return json({ data, has_more: false, next_page: null });
  }
  m = path.match(/^customers\/(cus_[A-Za-z0-9_]+)$/);
  if (m) {
    const customer = stripe.customers.get(m[1]);
    if (!customer) return json({ error: { message: "No such customer" } }, 404);
    if (method === "DELETE") {
      stripe.customers.delete(m[1]);
      return json({ id: m[1], deleted: true });
    }
    if (method === "POST") Object.assign(customer.metadata, metadataFrom(params));
    return json(customer);
  }
  return json({ error: { message: `fake Stripe has no route for ${method} ${path}` } }, 400);
}

function brevoHandler(method: string, url: URL, body: Record<string, unknown> | undefined) {
  const path = url.pathname.replace(/^\/v3\//, "");
  brevo.calls.push({ method, path: path + url.search, body });

  if (path === "contacts/attributes") return json({ attributes: [...brevo.attributes].map((name) => ({ name })) });
  let m = path.match(/^contacts\/attributes\/normal\/(.+)$/);
  if (m) {
    brevo.attributes.add(m[1]);
    return new Response(null, { status: 201 });
  }
  if (path === "contacts/lists" && method === "GET") return json({ lists: brevo.lists, count: brevo.lists.length });
  if (path === "contacts/folders" && method === "GET") return json({ folders: [{ id: 1 }] });
  if (path === "contacts/lists" && method === "POST") {
    const list = { id: brevo.lists.length + 2, name: String(body?.name) };
    brevo.lists.push(list);
    return json({ id: list.id }, 201);
  }
  m = path.match(/^contacts\/lists\/(\d+)\/contacts$/);
  if (m) {
    const id = Number(m[1]);
    const contacts = [...brevo.contacts.values()].filter((c) => c.listIds.includes(id));
    return json({ contacts, count: contacts.length });
  }
  if (path === "contacts" && method === "POST") {
    const email = String(body!.email);
    const existing = brevo.contacts.get(email);
    const contact = existing ?? { email, emailBlacklisted: false, attributes: {}, listIds: [] };
    Object.assign(contact.attributes, body!.attributes);
    contact.listIds = [...new Set([...contact.listIds, ...((body!.listIds as number[]) ?? [])])];
    if (body!.emailBlacklisted === false) contact.emailBlacklisted = false;
    brevo.contacts.set(email, contact);
    return json({ id: 1 }, existing ? 204 : 201);
  }
  m = path.match(/^contacts\/(.+)$/);
  if (m) {
    const email = decodeURIComponent(m[1]);
    const contact = brevo.contacts.get(email);
    if (!contact) return json({ code: "document_not_found" }, 404);
    if (method === "PUT") {
      Object.assign(contact.attributes, (body?.attributes as object) ?? {});
      if (typeof body?.emailBlacklisted === "boolean") contact.emailBlacklisted = body.emailBlacklisted;
      return new Response(null, { status: 204 });
    }
    return json(contact);
  }
  if (path === "smtp/email") {
    brevo.emails.push(body as (typeof brevo.emails)[number]);
    return json({ messageId: "<fake@brevo>" }, 201);
  }
  return json({ message: `fake Brevo has no route for ${method} ${path}` }, 400);
}

export function installFakeApis() {
  mailbox.sent = [];
  mailbox.failNext = false;
  stripe.calls = [];
  stripe.sessions.clear();
  stripe.intents.clear();
  stripe.customers.clear();
  brevo.calls = [];
  brevo.contacts.clear();
  brevo.attributes.clear();
  brevo.lists = [];
  brevo.emails = [];
  outsideCalls.length = 0;

  vi.stubGlobal("fetch", async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    const method = (init.method ?? "GET").toUpperCase();
    if (url.host === "api.stripe.com") {
      const params = init.body ? Object.fromEntries(new URLSearchParams(String(init.body))) : {};
      return stripeHandler(method, url, params);
    }
    if (url.host === "api.brevo.com") {
      return brevoHandler(method, url, init.body ? JSON.parse(String(init.body)) : undefined);
    }
    outsideCalls.push(`${method} ${url}`);
    return new Response("blocked in tests", { status: 599 });
  });
}

// Builds a Request for calling a route handler directly.
export const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://personalityreveal.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

export const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://personalityreveal.test${path}`, { headers });

// Answers that complete a test: the same middle answer for every question,
// or a fixed pattern when a test needs varied answers.
export function answersFor(items: number, points: number, pick: (i: number) => number = () => Math.ceil(points / 2)) {
  return Array.from({ length: items }, (_, i) => Math.min(points, Math.max(1, pick(i)))).join("");
}
