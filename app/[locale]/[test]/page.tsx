import Link from "next/link";
import { TestCard } from "@/components/TestCard";
import { allDefinitions, fmt, getTestText } from "@/lib/i18n/messages";
import { alternates } from "@/lib/seo";
import { loadTestPage, testStaticParams } from "@/lib/tests/params";

export const generateStaticParams = testStaticParams;
// Every test page is fully prerendered per locale/test, so blocking on params costs nothing.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/[test]">) {
  const { locale, def, text } = await loadTestPage(params);
  return {
    title: { absolute: text.seoTitle },
    description: text.seoDescription,
    alternates: alternates(locale, `/${def.slug}`),
  };
}

export default async function TestLanding({ params }: PageProps<"/[locale]/[test]">) {
  const { locale, def, ui, text } = await loadTestPage(params);
  const dimensionNames = def.dimensions.map((d) => text.dimensions[d]?.name ?? d).join(", ");
  const related = allDefinitions.filter((d) => d.category === def.category && d.slug !== def.slug).slice(0, 4);
  const relatedTexts = await Promise.all(related.map((d) => getTestText(locale, d.slug)));

  return (
    <div className="mx-auto max-w-4xl px-4 pt-14">
      <div className="rounded-3xl border border-border bg-surface p-8 text-center sm:p-12">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-4xl" aria-hidden>
          {def.icon}
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-5xl">{text.name}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{text.tagline}</p>
        <p className="mt-4 text-sm font-medium text-muted">
          {fmt(ui.test.questions, { count: def.items.length })} · {fmt(ui.test.minutes, { count: def.minutes })} · {ui.test.free}
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

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold">{ui.test.otherTests}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((d, i) => (
              <TestCard key={d.slug} locale={locale} ui={ui} def={d} text={relatedTexts[i]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
