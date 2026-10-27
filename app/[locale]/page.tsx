import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/Faq";
import { TestCard } from "@/components/TestCard";
import { hasLocale, locales } from "@/lib/i18n/locales";
import { fmt, getAllTestTexts, getUi } from "@/lib/i18n/messages";
import { alternates } from "@/lib/seo";
import { formatPrice, site } from "@/lib/site";
import type { Category } from "@/lib/tests/types";

const CATEGORY_ORDER: Category[] = ["personality", "relationships", "work", "screeners", "wellbeing"];

const button =
  "inline-flex h-12 items-center justify-center rounded-lg px-7 font-semibold transition";
const primary = `${button} bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-strong`;
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
  return { alternates: alternates(locale, "") };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const ui = await getUi(locale);
  const tests = await getAllTestTexts(locale);
  const h = ui.home;
  const vars = { price: formatPrice(locale), count: tests.length, languages: locales.length, site: site.name };

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-20 pt-16 text-center sm:pt-24">
        <span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
          {fmt(h.badge, vars)}
        </span>
        <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
          {h.heroTitle}
          <span className="block text-accent">{h.heroHighlight}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">{h.heroSubtitle}</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="#tests" className={primary}>{h.heroCta} →</Link>
          <Link href="#how" className={`${button} border border-border bg-surface hover:border-accent`}>{h.heroSecondary}</Link>
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
        {CATEGORY_ORDER.map((category) => {
          const inCategory = tests.filter((t) => t.def.category === category);
          if (!inCategory.length) return null;
          return (
            <div key={category} className="mt-12">
              <h3 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-muted">{ui.categories[category]}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {inCategory.map(({ def, text }) => (
                  <TestCard key={def.slug} locale={locale} ui={ui} def={def} text={text} />
                ))}
              </div>
            </div>
          );
        })}
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
                className={`${button} mx-auto mt-8 w-full max-w-56 ${plan.highlight ? "bg-accent text-white hover:bg-accent-strong" : "border border-accent text-accent hover:bg-accent-soft"}`}
              >
                {h.planCta}
              </Link>
            </div>
          ))}
        </div>
      </section>

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
