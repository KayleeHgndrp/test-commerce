import type { MetadataRoute } from "next";
import { locales, toLangTag } from "@/lib/i18n/locales";
import { allDefinitions } from "@/lib/i18n/messages";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", ...allDefinitions.map((def) => `/${def.slug}`)];
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${site.url}/${locale}${path}`,
      changeFrequency: "monthly" as const,
      priority: path ? 0.8 : 1,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [toLangTag(l), `${site.url}/${l}${path}`])),
      },
    })),
  );
}
