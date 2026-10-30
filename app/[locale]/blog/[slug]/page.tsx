import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogCard, BlogCover } from "@/components/BlogCard";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { TestCard } from "@/components/TestCard";
import { absoluteUrl, allPosts, formatPostDate, getPost, getRelatedPosts, getTranslations, postPath } from "@/lib/blog";
import { hasLocale, ogLocales, toLangTag, type Locale } from "@/lib/i18n/locales";
import { fmt, getDefinition, getTestText, getUi } from "@/lib/i18n/messages";
import { site } from "@/lib/site";

// Every post page is fully prerendered per locale/slug, so blocking on params costs nothing.
export const instant = false;

export function generateStaticParams() {
  const params = allPosts().map(({ locale, slug }) => ({ locale, slug }));
  // Cache Components needs at least one param; this one renders a 404.
  return params.length ? params : [{ locale: "en", slug: "none" }];
}

async function load(params: PageProps<"/[locale]/blog/[slug]">["params"]) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const post = getPost(locale, slug);
  if (!post) notFound();
  return { locale, post };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, post } = await load(params);
  const url = `${site.url}${postPath(post)}`;
  const translations = getTranslations(post);
  const english = translations.find((p) => p.locale === "en");
  const title = post.ogTitle ?? post.seoTitle;
  const description = post.ogDescription ?? post.metaDescription;
  const image = absoluteUrl(post.ogImage ?? post.image ?? `/${locale}/opengraph-image`);

  return {
    // A custom SEO title is used as-is; otherwise the site name is appended.
    title: post.seoTitle === post.title ? post.title : { absolute: post.seoTitle },
    description: post.metaDescription,
    keywords: post.keywords.length ? post.keywords : undefined,
    authors: [{ name: post.author ?? site.name, url: post.authorUrl }],
    robots: post.noindex ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: post.canonical ?? url,
      languages:
        translations.length > 1
          ? {
              ...Object.fromEntries(translations.map((p) => [toLangTag(p.locale as Locale), `${site.url}${postPath(p)}`])),
              ...(english ? { "x-default": `${site.url}${postPath(english)}` } : {}),
            }
          : undefined,
    },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: site.name,
      locale: ogLocales[locale],
      alternateLocale: translations.filter((p) => p !== post).map((p) => ogLocales[p.locale as Locale]),
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author ?? site.name],
      section: post.category,
      tags: post.tags,
      images: [{ url: image, alt: post.imageAlt ?? post.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function BlogPost({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, post } = await load(params);
  const ui = await getUi(locale);
  const { blog } = ui;
  const url = `${site.url}${postPath(post)}`;
  const related = getRelatedPosts(post);
  const tests = (
    await Promise.all(
      post.relatedTests.map(async (slug) => {
        const def = getDefinition(slug);
        return def ? { def, text: await getTestText(locale, slug) } : null;
      }),
    )
  ).filter((t) => t !== null);
  const meta = [post.category, formatPostDate(post.date, locale), fmt(blog.readTime, { count: post.readMinutes })].filter(Boolean);
  const author = post.author ?? site.name;
  const organization = { "@type": "Organization", "@id": `${site.url}/#org`, name: site.name, url: site.url, logo: `${site.url}/icon.png` };

  return (
    <article className="mx-auto max-w-3xl px-4 pt-10 sm:pt-14">
      <Link href={`/${locale}/blog`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        ← {blog.back}
      </Link>

      <header className="mt-8">
        <p className="text-sm font-medium text-accent">{meta.join(" · ")}</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{post.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border py-4 text-sm">
          <span className="text-muted">{blog.writtenBy}</span>
          {post.authorUrl ? (
            <a href={post.authorUrl} rel="author" className="font-semibold hover:text-accent">{author}</a>
          ) : (
            <span className="font-semibold">{author}</span>
          )}
          {post.updated && <span className="text-muted">· {fmt(blog.updated, { date: formatPostDate(post.updated, locale) })}</span>}
        </div>
      </header>

      {post.image && (
        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-3xl border border-border">
          <BlogCover post={post} priority sizes="(max-width: 768px) 100vw, 768px" />
        </div>
      )}

      {post.headings.filter((h) => h.depth === 2).length >= 3 && (
        <nav aria-label={blog.toc} className="mt-10 rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm font-bold">{blog.toc}</p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {post.headings.map((h) => (
              <li key={h.id} className={h.depth === 3 ? "pl-4" : ""}>
                <a href={`#${h.id}`} className="text-muted hover:text-accent">{h.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="prose-blog mt-10" dangerouslySetInnerHTML={{ __html: post.html }} />

      {post.faq.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">{ui.home.faqTitle}</h2>
          <Faq items={post.faq} />
        </section>
      )}

      {tests.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">{blog.tryTest}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tests.map(({ def, text }) => (
              <TestCard
                key={def.slug}
                locale={locale}
                cta={ui.test.tryNow}
                test={{
                  slug: def.slug,
                  name: text.name,
                  tagline: text.tagline,
                  meta: `${fmt(ui.test.questions, { count: def.items.length })} · ${fmt(ui.test.minutes, { count: def.minutes })}`,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16 border-t border-border pt-12">
          <h2 className="mb-6 text-2xl font-bold">{blog.related}</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {related.map((p) => (
              <BlogCard key={p.slug} post={p} readTime={blog.readTime} />
            ))}
          </div>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BlogPosting",
              "@id": `${url}#article`,
              mainEntityOfPage: url,
              headline: post.title,
              description: post.metaDescription,
              image: absoluteUrl(post.image ?? post.ogImage ?? `/${locale}/opengraph-image`),
              datePublished: post.date,
              dateModified: post.updated ?? post.date,
              inLanguage: toLangTag(locale),
              author: post.author
                ? { "@type": "Person", name: post.author, ...(post.authorUrl ? { url: post.authorUrl } : {}) }
                : organization,
              publisher: organization,
              articleSection: post.category,
              keywords: [...post.keywords, ...post.tags].join(", ") || undefined,
              timeRequired: `PT${post.readMinutes}M`,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: site.name, item: `${site.url}/${locale}` },
                { "@type": "ListItem", position: 2, name: blog.title, item: `${site.url}/${locale}/blog` },
                { "@type": "ListItem", position: 3, name: post.title, item: url },
              ],
            },
            ...(post.faq.length
              ? [
                  {
                    "@type": "FAQPage",
                    mainEntity: post.faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
                  },
                ]
              : []),
          ],
        }}
      />
    </article>
  );
}
