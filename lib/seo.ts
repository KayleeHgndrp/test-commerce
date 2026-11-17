import type { Metadata } from "next";
import { indexedLocales, isIndexedLocale, locales, ogLocales, toLangTag, type Locale } from "@/lib/i18n/locales";
import { site } from "@/lib/site";

// Near-identical pages in every language (legal texts, contact form). Useful for visitors,
// thin content for Google, so they stay out of search in every language.
export const noindexPaths = ["/privacy", "/terms", "/cookies", "/refund", "/legal-notice", "/contact"];

export const NOINDEX: Metadata["robots"] = { index: false, follow: true };

// Whether a page below the locale segment may appear in Google.
export const isIndexable = (locale: string, path: string) => isIndexedLocale(locale) && !noindexPaths.includes(path);

// hreflang links between the indexed languages, plus English as x-default.
export function hreflang(href: (locale: Locale) => string, available: readonly Locale[] = indexedLocales) {
  const langs = indexedLocales.filter((l) => available.includes(l));
  if (langs.length < 2) return undefined;
  return {
    ...Object.fromEntries(langs.map((l) => [toLangTag(l), href(l)])),
    ...(langs.includes("en") ? { "x-default": href("en") } : {}),
  };
}

// Canonical, hreflang, robots and Open Graph tags for a path below the locale segment ("" or "/burnout").
// `imagePath` is the segment whose opengraph-image route to share; it defaults to the locale's.
export function pageSeo(locale: Locale, path: string, imagePath = ""): Pick<Metadata, "alternates" | "openGraph" | "robots"> {
  const url = `${site.url}/${locale}${path}`;
  const indexable = isIndexable(locale, path);
  return {
    robots: indexable ? undefined : NOINDEX,
    alternates: {
      canonical: url,
      languages: indexable ? hreflang((l) => `${site.url}/${l}${path}`) : undefined,
    },
    openGraph: {
      type: "website",
      url,
      siteName: site.name,
      locale: ogLocales[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocales[l]),
      images: [{ url: `${site.url}/${locale}${imagePath}/opengraph-image`, width: 1200, height: 630, alt: site.name }],
    },
  };
}

// Shortens text to a meta description on a word boundary.
export function metaDescription(text: string, max = 155) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.–—-]+$/, "")}…`; // dash-ok: strips trailing punctuation
}
