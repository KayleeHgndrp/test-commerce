// Minimal Brevo (ex-Sendinblue) client for the email flow. Brevo holds the
// contact list, so this app still needs no database of its own.
const API = "https://api.brevo.com/v3";
const LIST_NAME = "Personality Reveal";

// Contact attributes the flow reads and writes. Created on first use.
const ATTRIBUTES = {
  LOCALE: "text",
  TEST: "text",
  ANSWERS: "text",
  GENDER: "text",
  CONSENT_AT: "text",
  FLOW_START: "text",
  FLOW_STEP: "float",
  PURCHASED_AT: "text",
  BUNDLE_SESSION: "text",
} as const;

export type ContactAttributes = Partial<Record<keyof typeof ATTRIBUTES, string | number>>;

export type Contact = {
  email: string;
  emailBlacklisted: boolean;
  attributes: ContactAttributes;
};

export const brevoEnabled = () => Boolean(process.env.BREVO_API_KEY);

export class BrevoError extends Error {
  constructor(public status: number, body: string) {
    super(`Brevo ${status}: ${body.slice(0, 300)}`);
  }
}

export async function brevo<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      "api-key": process.env.BREVO_API_KEY ?? "",
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new BrevoError(res.status, text);
  return (text ? JSON.parse(text) : undefined) as T;
}

let listId: Promise<number> | undefined;

// Finds (or creates) the contact list and the attributes the flow uses, once per
// server instance. BREVO_LIST_ID skips the lookup.
export function getListId() {
  listId ??= (async () => {
    const attrs = await brevo<{ attributes: { name: string }[] }>("contacts/attributes");
    const existing = new Set(attrs.attributes.map((a) => a.name));
    for (const [name, type] of Object.entries(ATTRIBUTES)) {
      if (!existing.has(name)) await brevo(`contacts/attributes/normal/${name}`, { body: { type } });
    }

    if (process.env.BREVO_LIST_ID) return Number(process.env.BREVO_LIST_ID);
    const lists = await brevo<{ lists?: { id: number; name: string }[] }>("contacts/lists?limit=50");
    const found = lists.lists?.find((l) => l.name === LIST_NAME);
    if (found) return found.id;
    const folders = await brevo<{ folders?: { id: number }[] }>("contacts/folders?limit=10");
    const folderId = folders.folders?.[0]?.id ?? (await brevo<{ id: number }>("contacts/folders", { body: { name: LIST_NAME } })).id;
    return (await brevo<{ id: number }>("contacts/lists", { body: { name: LIST_NAME, folderId } })).id;
  })();
  listId.catch(() => (listId = undefined));
  return listId;
}

// Creates or updates a contact in the list. A new, explicit opt-in also lifts an
// earlier unsubscribe.
export async function upsertContact(email: string, attributes: ContactAttributes, resubscribe = false) {
  await brevo("contacts", {
    body: {
      email,
      attributes,
      listIds: [await getListId()],
      updateEnabled: true,
      ...(resubscribe ? { emailBlacklisted: false } : {}),
    },
  });
}

export async function getContact(email: string): Promise<Contact | null> {
  try {
    return await brevo<Contact>(`contacts/${encodeURIComponent(email)}`);
  } catch (error) {
    if (error instanceof BrevoError && error.status === 404) return null;
    throw error;
  }
}

export async function updateContact(email: string, body: { attributes?: ContactAttributes; emailBlacklisted?: boolean }) {
  await brevo(`contacts/${encodeURIComponent(email)}`, { method: "PUT", body });
}

export async function* listContacts() {
  const id = await getListId();
  for (let offset = 0; ; offset += 500) {
    const page = await brevo<{ contacts: Contact[]; count: number }>(`contacts/lists/${id}/contacts?limit=500&offset=${offset}`);
    yield* page.contacts;
    if (offset + 500 >= page.count) return;
  }
}

export async function sendBrevoEmail(
  to: string,
  message: { subject: string; html: string; text: string; unsubscribeUrl: string; tag: string },
  sender: { name: string; email: string },
) {
  await brevo("smtp/email", {
    body: {
      sender,
      to: [{ email: to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
      tags: [message.tag],
      headers: {
        "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
  });
}
