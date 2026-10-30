import Link from "next/link";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { TestCard } from "@/components/TestCard";
import { allDefinitions, fmt, getTestText } from "@/lib/i18n/messages";
import { pageSeo } from "@/lib/seo";
import { formatPrice, site } from "@/lib/site";
import { loadTestPage, testStaticParams } from "@/lib/tests/params";

export const generateStaticParams = testStaticParams;
// Every test page is fully prerendered per locale/test, so blocking on params costs nothing.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/[test]">) {
  const { locale, def, text } = await loadTestPage(params);
  return {
    title: { absolute: text.seoTitle },
    description: text.seoDescription,
    ...pageSeo(locale, `/${def.slug}`, `/${def.slug}`),
  };
}

export default async function TestLanding({ params }: PageProps<"/[locale]/[test]">) {
  const { locale, def, ui, text } = await loadTestPage(params);
  const dimensionNames = def.dimensions.map((d) => text.dimensions[d]?.name ?? d).join(", ");
  const related = allDefinitions.filter((d) => d.category === def.category && d.slug !== def.slug).slice(0, 4);
  const relatedTexts = await Promise.all(related.map((d) => getTestText(locale, d.slug)));
  const vars = {
    test: text.name,
    dimensions: dimensionNames,
    count: def.items.length,
    minutes: def.minutes,
    price: formatPrice(locale),
  };
  const faq = ui.test.faq.map(({ q, a }) => ({ q: fmt(q, vars), a: fmt(a, vars) }));

  return (
    <div className="mx-auto max-w-4xl px-4 pt-14">
      <div className="rounded-3xl border border-border bg-surface p-8 text-center sm:p-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{text.name}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{text.tagline}</p>
        <p className="mt-4 text-sm font-medium text-muted">
          {fmt(ui.test.questions, { count: def.items.length })} · {fmt(ui.test.minutes, { count: def.minutes })}
        </p>
        <Link
          href={`/${locale}/${def.slug}/start`}
          className="mt-8 inline-flex h-12 items-center rounded-lg bg-accent px-8 font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-strong"
        >
          {ui.test.start} →
        </Link>
        {def.category === "screeners" && <p className="mt-4 text-xs text-muted">{ui.test.screenerNote}</p>}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold">{ui.test.aboutTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{text.intro}</p>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold">{ui.test.whatYouGet}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            {[fmt(ui.test.whatYouGet1, { dimensions: dimensionNames }), ui.test.whatYouGet2, ui.test.whatYouGet3].map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-accent">✓</span>
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-bold">{fmt(ui.test.faqTitle, vars)}</h2>
        <Faq items={faq} />
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: site.name, item: `${site.url}/${locale}` },
            { "@type": "ListItem", position: 2, name: text.name, item: `${site.url}/${locale}/${def.slug}` },
          ],
        }}
      />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold">{ui.test.otherTests}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((d, i) => (
              <TestCard
                key={d.slug}
                locale={locale}
                cta={ui.test.tryNow}
                test={{
                  slug: d.slug,
                  name: relatedTexts[i].name,
                  tagline: relatedTexts[i].tagline,
                  meta: `${fmt(ui.test.questions, { count: d.items.length })} · ${fmt(ui.test.minutes, { count: d.minutes })}`,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
