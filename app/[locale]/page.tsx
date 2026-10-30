import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/Faq";
import { BlogCard } from "@/components/BlogCard";
import { JsonLd } from "@/components/JsonLd";
import { TestCarousel } from "@/components/TestCarousel";
import { hasLocale, locales, toLangTag } from "@/lib/i18n/locales";
import { fmt, getAllTestTexts, getUi } from "@/lib/i18n/messages";
import { getPosts } from "@/lib/blog";
import { pageSeo } from "@/lib/seo";
import { formatPrice, site } from "@/lib/site";
import type { Category } from "@/lib/tests/types";

const CATEGORY_ORDER: Category[] = ["personality", "relationships", "work", "screeners", "wellbeing"];

const button = "inline-flex items-center justify-center rounded-lg font-semibold transition";
const accent = "bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-strong";
const primary = `${button} ${accent} h-12 px-7`;
const primaryLarge = `${button} ${accent} h-14 px-9 text-lg`;
const card = "rounded-3xl border border-border bg-surface";

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  return hasLocale(locale) ? pageSeo(locale, "") : {};
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const ui = await getUi(locale);
  const tests = await getAllTestTexts(locale);
  const h = ui.home;
  const latestPosts = getPosts(locale).slice(0, 3);
  const vars = { price: formatPrice(locale), count: tests.length, languages: locales.length, site: site.name };

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-20 pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-6xl">
          {h.heroTitle}
          <span className="block text-accent">{h.heroHighlight}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">{h.heroSubtitle}</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="#tests" className={primaryLarge}>{h.heroCta} →</Link>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted">
          {[h.trust1, h.trust2, h.trust3].map((t) => (
            <li key={t} className="flex items-center gap-1.5"><Check />{t}</li>
          ))}
        </ul>
      </section>

      {/* Dimensions */}
      <section className="mx-auto max-w-5xl px-4">
        <div className={`${card} px-6 py-12 text-center`}>
          <h2 className="text-2xl font-extrabold sm:text-4xl">{h.dimensionsTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{h.dimensionsSubtitle}</p>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
            {h.dimensions.map((d) => (
              <li key={d} className="rounded-full bg-accent-soft px-4 py-2.5 text-sm font-semibold">{d}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tests */}
      <section id="tests" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-24">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{h.testsTitle}</h2>
          <p className="mt-3 text-muted">{h.testsSubtitle}</p>
        </div>
        <div className="mt-10">
          <TestCarousel
            locale={locale}
            tests={tests.map(({ def, text }) => ({
              slug: def.slug,
              name: text.name,
              tagline: text.tagline,
              category: def.category,
              meta: `${fmt(ui.test.questions, { count: def.items.length })} · ${fmt(ui.test.minutes, { count: def.minutes })}`,
            }))}
            categories={CATEGORY_ORDER.map((id) => ({ id, label: ui.categories[id] }))}
            allLabel={h.allTests}
            cta={ui.test.tryNow}
            previousLabel={h.previous}
            nextLabel={h.next}
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl scroll-mt-20 px-4 pt-24">
        <div className={`${card} px-6 py-12`}>
          <h2 className="mx-auto max-w-xl text-center text-3xl font-extrabold sm:text-4xl">{h.howTitle}</h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-3">
            {h.steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-border p-6 text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-dashed border-accent/40">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-accent font-display text-lg font-bold text-accent">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-5 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl scroll-mt-20 px-4 pt-24">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{h.pricingTitle}</h2>
          <p className="mt-3 text-muted">{h.pricingSubtitle}</p>
        </div>
        <div className={`${card} mt-10 grid md:grid-cols-2`}>
          {[
            { name: h.planFreeName, price: h.planFreePrice, per: "", features: h.planFreeFeatures, highlight: false },
            { name: h.planReportName, price: fmt(h.planReportPrice, vars), per: h.planReportPer, features: h.planReportFeatures, highlight: true },
          ].map((plan, i) => (
            <div key={plan.name} className={`flex flex-col p-8 sm:p-10 ${i ? "border-t border-border md:border-l md:border-t-0" : ""}`}>
              <div className="text-center">
                <h3 className="text-3xl font-extrabold">{plan.name}</h3>
                <p className="mt-2 text-muted">
                  <strong className="text-foreground">{plan.price}</strong>
                  {plan.per && ` · ${plan.per}`}
                </p>
              </div>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3"><Check />{fmt(f, vars)}</li>
                ))}
              </ul>
              <Link
                href="#tests"
                className={`${button} h-12 px-7 mx-auto mt-8 w-full max-w-56 ${plan.highlight ? "bg-accent text-white hover:bg-accent-strong" : "border border-accent text-accent hover:bg-accent-soft"}`}
              >
                {h.planCta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${site.url}/#org`,
              name: site.name,
              url: site.url,
              logo: `${site.url}/icon.png`,
              email: site.contactEmail,
              description: fmt(ui.about.mission, vars),
            },
            {
              "@type": "WebSite",
              "@id": `${site.url}/${locale}#website`,
              name: site.name,
              url: `${site.url}/${locale}`,
              inLanguage: toLangTag(locale),
              description: fmt(ui.meta.description, vars),
              publisher: { "@id": `${site.url}/#org` },
            },
            {
              "@type": "ItemList",
              name: h.testsTitle,
              numberOfItems: tests.length,
              itemListElement: tests.map(({ def, text }, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: text.name,
                description: text.tagline,
                url: `${site.url}/${locale}/${def.slug}`,
              })),
            },
            {
              "@type": "FAQPage",
              mainEntity: h.faq.map(({ q, a }) => ({
                "@type": "Question",
                name: fmt(q, vars),
                acceptedAnswer: { "@type": "Answer", text: fmt(a, vars) },
              })),
            },
          ],
        }}
      />

      {/* Latest blog posts */}
      {latestPosts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-extrabold sm:text-4xl">{ui.blog.latest}</h2>
            <Link href={`/${locale}/blog`} className="text-sm font-semibold text-accent hover:text-accent-strong">{ui.blog.all} →</Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestPosts.map((post) => (
              <BlogCard key={post.slug} post={post} readTime={ui.blog.readTime} />
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pt-24">
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">{h.faqTitle}</h2>
        <div className="mt-10">
          <Faq items={h.faq.map(({ q, a }) => ({ q: fmt(q, vars), a: fmt(a, vars) }))} />
        </div>
        <div className="mt-14 text-center">
          <p className="mb-5 text-lg font-semibold">{h.ctaTitle}</p>
          <Link href="#tests" className={primary}>{h.ctaButton} →</Link>
        </div>
      </section>
    </>
  );
}
