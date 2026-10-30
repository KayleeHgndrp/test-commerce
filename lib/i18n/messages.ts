import { definitions, messageLoaders } from "@/lib/generated/registry";
import type { TestDefinition, TestText } from "@/lib/tests/types";
import { defaultLocale, type Locale } from "./locales";
import type enEmail from "@/messages/en/email.json";
import type enUi from "@/messages/en/ui.json";

export type UiMessages = typeof enUi;
export type EmailMessages = typeof enEmail;

type Json = Record<string, unknown>;

// Missing keys in a translation fall back to English, so a partially
// translated locale still renders completely.
function merge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base;
  if (Array.isArray(base) || typeof base !== "object" || base === null) {
    return (Array.isArray(base) && Array.isArray(override) && override.length !== base.length
      ? base
      : override) as T;
  }
  const out: Json = { ...(base as Json) };
  for (const [key, value] of Object.entries(override as Json)) {
    out[key] = key in out ? merge(out[key], value) : value;
  }
  return out as T;
}

async function load<T>(locale: Locale, file: string): Promise<T> {
  const base = (await messageLoaders[`${defaultLocale}/${file}`]()) as T;
  const loader = locale === defaultLocale ? undefined : messageLoaders[`${locale}/${file}`];
  return loader ? merge(base, await loader()) : base;
}

export const getUi = (locale: Locale) => load<UiMessages>(locale, "ui");

export const getEmailMessages = (locale: Locale) => load<EmailMessages>(locale, "email");

export const getTestText = (locale: Locale, slug: string) => load<TestText>(locale, `tests/${slug}`);

export const getDefinition = (slug: string): TestDefinition | undefined =>
  definitions.find((d) => d.slug === slug);

export const allDefinitions = definitions;

export async function getAllTestTexts(locale: Locale) {
  return Promise.all(
    definitions.map(async (def) => ({ def, text: await getTestText(locale, def.slug) })),
  );
}

export { fmt } from "./fmt";
