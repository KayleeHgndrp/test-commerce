import type { Metadata } from "next";
import { locales, ogLocales, toLangTag, type Locale } from "@/lib/i18n/locales";
import { site } from "@/lib/site";

// Canonical, hreflang and Open Graph tags for a path below the locale segment ("" or "/burnout").
// `imagePath` is the segment whose opengraph-image route to share; it defaults to the locale's.
export function pageSeo(locale: Locale, path: string, imagePath = ""): Pick<Metadata, "alternates" | "openGraph"> {
  const url = `${site.url}/${locale}${path}`;
  return {
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(locales.map((l) => [toLangTag(l), `${site.url}/${l}${path}`])),
        "x-default": `${site.url}/en${path}`,
      },
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
