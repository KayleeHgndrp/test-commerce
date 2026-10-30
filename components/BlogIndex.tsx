import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogCard } from "@/components/BlogCard";
import { BlogPagination, blogPageHref } from "@/components/BlogPagination";
import { JsonLd } from "@/components/JsonLd";
import { blogPageCount, getPostsPage, hasPosts, postPath } from "@/lib/blog";
import { hasLocale, locales, ogLocales, toLangTag, type Locale } from "@/lib/i18n/locales";
import { fmt, getUi } from "@/lib/i18n/messages";
import { site } from "@/lib/site";

export async function blogIndexMetadata(locale: string, page: number): Promise<Metadata> {
  if (!hasLocale(locale)) return {};
  const { blog } = await getUi(locale);
  const title = page > 1 ? `${blog.title} – ${fmt(blog.page, { page })}` : blog.title;
  const url = `${site.url}${blogPageHref(locale, page)}`;
  const withPosts = locales.filter(hasPosts);
  return {
    title,
    description: blog.subtitle,
    // An empty blog is thin content: keep it out of search until there are posts.
    robots: hasPosts(locale) ? undefined : { index: false, follow: true },
    alternates: {
      canonical: url,
      languages:
        page === 1
          ? {
              ...Object.fromEntries(withPosts.map((l) => [toLangTag(l), `${site.url}/${l}/blog`])),
              ...(withPosts.includes("en") ? { "x-default": `${site.url}/en/blog` } : {}),
            }
          : undefined,
    },
    openGraph: {
      type: "website",
      url,
      title,
      description: blog.subtitle,
      siteName: site.name,
      locale: ogLocales[locale],
      images: [{ url: `${site.url}/${locale}/opengraph-image`, width: 1200, height: 630, alt: site.name }],
    },
  };
}

export async function BlogIndex({ locale, page }: { locale: string; page: number }) {
  if (!hasLocale(locale)) notFound();
  const total = blogPageCount(locale);
  if (page < 1 || page > total) notFound();
  const ui = await getUi(locale);
  const { blog } = ui;
  const posts = getPostsPage(locale as Locale, page);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{blog.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{blog.subtitle}</p>
      </header>

      {posts.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-border bg-surface px-6 py-16 text-center">
          <h2 className="text-xl font-bold">{blog.empty}</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">{blog.emptyText}</p>
          <Link href={`/${locale}#tests`} className="mt-8 inline-flex h-12 items-center rounded-lg bg-accent px-7 font-semibold text-white hover:bg-accent-strong">
            {ui.home.heroCta} →
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} readTime={blog.readTime} />
            ))}
          </div>
          <BlogPagination locale={locale} page={page} total={total} labels={{ previous: ui.home.previous, next: ui.home.next, page: blog.page }} />
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "Blog",
              name: `${site.name} ${blog.title}`,
              description: blog.subtitle,
              url: `${site.url}/${locale}/blog`,
              inLanguage: toLangTag(locale),
              publisher: { "@id": `${site.url}/#org` },
              blogPost: posts.map((post) => ({
                "@type": "BlogPosting",
                headline: post.title,
                url: `${site.url}${postPath(post)}`,
                datePublished: post.date,
              })),
            }}
          />
        </>
      )}
    </div>
  );
}
