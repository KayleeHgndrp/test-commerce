import { locales, toLangTag } from "@/lib/i18n/locales";
import { site } from "@/lib/site";

// Canonical + hreflang links for a path below the locale segment ("" or "/burnout").
export function alternates(locale: string, path: string) {
  return {
    canonical: `${site.url}/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [toLangTag(l), `${site.url}/${l}${path}`])),
      "x-default": `${site.url}/en${path}`,
    },
  };
}
