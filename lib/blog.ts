import generated from "@/lib/generated/blog.json";
import type { Locale } from "@/lib/i18n/locales";
import { site } from "@/lib/site";

export type BlogPost = {
  locale: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  author?: string;
  authorUrl?: string;
  category?: string;
  tags: string[];
  image?: string;
  imageAlt?: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  canonical?: string;
  noindex: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  translationKey?: string;
  related: string[];
  relatedTests: string[];
  faq: { q: string; a: string }[];
  draft: boolean;
  readMinutes: number;
  headings: { id: string; text: string; depth: number }[];
  html: string;
};

export const BLOG_PAGE_SIZE = 12;

// Drafts are visible while developing locally but never in production.
const showDrafts = process.env.NODE_ENV !== "production";

const posts = (generated as BlogPost[]).filter((post) => showDrafts || !post.draft);

export const allPosts = () => posts;

export const getPosts = (locale: Locale) => posts.filter((post) => post.locale === locale);

export const hasPosts = (locale: Locale) => posts.some((post) => post.locale === locale);

export const getPost = (locale: Locale, slug: string) =>
  posts.find((post) => post.locale === locale && post.slug === slug);

export const blogPageCount = (locale: Locale) => Math.max(1, Math.ceil(getPosts(locale).length / BLOG_PAGE_SIZE));

export const getPostsPage = (locale: Locale, page: number) =>
  getPosts(locale).slice((page - 1) * BLOG_PAGE_SIZE, page * BLOG_PAGE_SIZE);

export const postPath = (post: Pick<BlogPost, "locale" | "slug">) => `/${post.locale}/blog/${post.slug}`;

export const absoluteUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `${site.url}${url.startsWith("/") ? "" : "/"}${url}`);

// The same article in other languages, linked through a shared translationKey.
export function getTranslations(post: BlogPost) {
  if (!post.translationKey) return [post];
  return posts.filter((p) => p.translationKey === post.translationKey && !p.noindex);
}

// Explicitly listed related posts first, then posts sharing a category or tag.
export function getRelatedPosts(post: BlogPost, limit = 3) {
  const sameLocale = getPosts(post.locale as Locale).filter((p) => p.slug !== post.slug);
  const listed = post.related.flatMap((slug) => sameLocale.filter((p) => p.slug === slug));
  const score = (p: BlogPost) => (p.category && p.category === post.category ? 2 : 0) + p.tags.filter((t) => post.tags.includes(t)).length;
  const rest = sameLocale
    .filter((p) => !listed.includes(p) && score(p) > 0)
    .sort((a, b) => score(b) - score(a));
  return [...listed, ...rest].slice(0, limit);
}

export function formatPostDate(iso: string, locale: Locale) {
  const tag = locale === "no" ? "nb" : locale;
  return new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}
