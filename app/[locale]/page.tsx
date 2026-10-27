import { notFound } from "next/navigation";
import { TestCard } from "@/components/TestCard";
import { hasLocale, locales } from "@/lib/i18n/locales";
import { fmt, getAllTestTexts, getUi } from "@/lib/i18n/messages";
import { alternates } from "@/lib/seo";
import { formatPrice } from "@/lib/site";
import type { Category } from "@/lib/tests/types";

const CATEGORY_ORDER: Category[] = ["personality", "relationships", "work", "screeners", "wellbeing"];

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  return { alternates: alternates(locale, "") };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const ui = await getUi(locale);
  const tests = await getAllTestTexts(locale);
  const price = formatPrice(locale);
  const h = ui.home;

  const steps = [
    [h.step1Title, h.step1Text],
    [h.step2Title, h.step2Text],
    [h.step3Title, fmt(h.step3Text, { price })],
  ];
  const faqs = [1, 2, 3, 4, 5].map((n) => [
    h[`faq${n}Q` as keyof typeof h],
    fmt(h[`faq${n}A` as keyof typeof h], { price }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-96 max-w-3xl rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-20 text-center sm:pt-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{h.heroTitle}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {fmt(h.heroSubtitle, { count: tests.length, price })}
          </p>
          <a
            href="#tests"
            className="mt-10 inline-flex h-12 items-center rounded-full bg-accent px-7 font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-strong"
          >
            {h.heroCta}
          </a>
        </div>
      </section>

      <section id="tests" className="mx-auto max-w-6xl scroll-mt-20 px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{h.testsTitle}</h2>
          <p className="mt-2 text-muted">{fmt(h.testsSubtitle, { languages: locales.length })}</p>
        </div>
        {CATEGORY_ORDER.map((category) => {
          const inCategory = tests.filter((t) => t.def.category === category);
          if (!inCategory.length) return null;
          return (
            <div key={category} className="mt-12">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                {ui.categories[category]}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {inCategory.map(({ def, text }) => (
                  <TestCard key={def.slug} locale={locale} ui={ui} def={def} text={text} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section id="how" className="mx-auto mt-24 max-w-6xl scroll-mt-20 px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight">{h.howTitle}</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-border bg-surface p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-bold text-white">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="faq" className="mx-auto mt-24 max-w-3xl scroll-mt-20 px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight">{h.faqTitle}</h2>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
          {faqs.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
