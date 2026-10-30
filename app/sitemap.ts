import type { MetadataRoute } from "next";
import { locales, toLangTag } from "@/lib/i18n/locales";
import { allDefinitions } from "@/lib/i18n/messages";
import { site } from "@/lib/site";

type Page = [path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly"];

const pages: Page[] = [
  ["", 1, "weekly"],
  ...allDefinitions.map((def) => [`/${def.slug}`, 0.8, "monthly"] satisfies Page),
  ["/about", 0.5, "monthly"],
  ["/contact", 0.4, "yearly"],
  ...["/privacy", "/terms", "/cookies", "/refund", "/legal-notice"].map((path) => [path, 0.2, "yearly"] satisfies Page),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.flatMap(([path, priority, changeFrequency]) =>
    locales.map((locale) => ({
      url: `${site.url}/${locale}${path}`,
      changeFrequency,
      priority,
      alternates: {
        languages: {
          ...Object.fromEntries(locales.map((l) => [toLangTag(l), `${site.url}/${l}${path}`])),
          "x-default": `${site.url}/en${path}`,
        },
      },
    })),
  );
}
