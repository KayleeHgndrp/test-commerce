import type { MetadataRoute } from "next";
import { allPosts, getTranslations, hasPosts, postPath } from "@/lib/blog";
import { locales, toLangTag, type Locale } from "@/lib/i18n/locales";
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

// Blog index pages for languages with posts, and every indexable post with its translations.
function blogEntries(): MetadataRoute.Sitemap {
  const withPosts = locales.filter(hasPosts);
  const index = withPosts.map((locale) => ({
    url: `${site.url}/${locale}/blog`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
    alternates: { languages: Object.fromEntries(withPosts.map((l) => [toLangTag(l), `${site.url}/${l}/blog`])) },
  }));
  const posts = allPosts()
    .filter((post) => !post.noindex && !post.canonical)
    .map((post) => {
      const translations = getTranslations(post);
      return {
        url: `${site.url}${postPath(post)}`,
        lastModified: post.updated ?? post.date,
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates:
          translations.length > 1
            ? { languages: Object.fromEntries(translations.map((p) => [toLangTag(p.locale as Locale), `${site.url}${postPath(p)}`])) }
            : undefined,
      };
    });
  return [...index, ...posts];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [...pageEntries(), ...blogEntries()];
}

function pageEntries(): MetadataRoute.Sitemap {
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
