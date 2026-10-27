import { notFound } from "next/navigation";
import { hasLocale, locales } from "@/lib/i18n/locales";
import { allDefinitions, getDefinition, getTestText, getUi } from "@/lib/i18n/messages";

export function testStaticParams() {
  return locales.flatMap((locale) => allDefinitions.map((def) => ({ locale, test: def.slug })));
}

// Resolves and validates the [locale]/[test] route params, 404ing on unknown values.
export async function loadTestPage(params: Promise<{ locale: string; test: string }>) {
  const { locale, test } = await params;
  const def = getDefinition(test);
  if (!hasLocale(locale) || !def) notFound();
  const [ui, text] = await Promise.all([getUi(locale), getTestText(locale, test)]);
  return { locale, def, ui, text };
}
