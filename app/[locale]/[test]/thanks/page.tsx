import Link from "next/link";
import { Suspense } from "react";
import { BundleOffer } from "@/components/BundleOffer";
import { ReportView } from "@/components/ReportView";
import { TestCard } from "@/components/TestCard";
import { TrackPurchase } from "@/components/TrackPurchase";
import { deliverOnce, retrievePaidOrder } from "@/lib/delivery";
import type { Locale } from "@/lib/i18n/locales";
import { allDefinitions, fmt, getDefinition, getTestText, type UiMessages } from "@/lib/i18n/messages";
import { buildReport } from "@/lib/report/render";
import { formatPrice, site } from "@/lib/site";
import { loadTestPage, testStaticParams } from "@/lib/tests/params";
import { decodeAnswers } from "@/lib/tests/scoring";

export const generateStaticParams = testStaticParams;
// Every test page is fully prerendered per locale/test, so blocking on params costs nothing.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/[test]/thanks">) {
  const { ui } = await loadTestPage(params);
  return { title: ui.thanks.title, robots: { index: false } };
}

// Shows the paid report on the page as well. Also delivers the email if the
// Stripe webhook has not done so yet.
async function PaidReport({ locale, slug, thanks, searchParams }: { locale: Locale; slug: string; thanks: UiMessages["thanks"]; searchParams: PageProps<"/[locale]/[test]/thanks">["searchParams"] }) {
  const query = await searchParams;
  const sessionId = typeof query.session_id === "string" ? query.session_id : "";
  let answers: number[] | null = null;
  let order: Awaited<ReturnType<typeof retrievePaidOrder>> = null;

  if (sessionId) {
    order = await retrievePaidOrder(sessionId);
    if (order && order.slug === slug) {
      answers = order.answers;
      await deliverOnce(order).catch((error) => console.error("[thanks] delivery failed", error));
    }
  } else if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "production" && typeof query.dev_answers === "string") {
    // Local development without Stripe.
    answers = decodeAnswers(getDefinition(slug)!, query.dev_answers);
  }

  if (!answers) return null;
  const offerVars = { price: formatPrice(locale, site.bundlePriceCents), full: formatPrice(locale), days: site.bundleDays };
  return (
    <div className="mt-10">
      {sessionId && <TrackPurchase test={slug} sessionId={sessionId} amount={(order?.session.amount_total ?? site.priceCents) / 100} currency={site.currency} />}
      <ReportView report={await buildReport(locale, slug, answers)} />
      {order && !order.session.metadata.bundle_from && (
        <BundleOffer
          sessionId={order.session.id}
          slug={slug}
          until={(order.session.created + site.bundleDays * 86400) * 1000}
          title={fmt(thanks.bundleTitle, offerVars)}
          text={fmt(thanks.bundleText, offerVars)}
        />
      )}
    </div>
  );
}

export default async function ThanksPage({ params, searchParams }: PageProps<"/[locale]/[test]/thanks">) {
  const { locale, def, ui, text } = await loadTestPage(params);
  // Buyers are the warmest audience we have, so suggest the next test in the same category.
  const related = allDefinitions.filter((d) => d.category === def.category && d.slug !== def.slug).slice(0, 4);
  const relatedTexts = await Promise.all(related.map((d) => getTestText(locale, d.slug)));
  return (
    <div className="mx-auto mt-12 max-w-3xl px-4">
      <div className="rounded-3xl border border-border bg-surface p-8 sm:p-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{ui.thanks.title}</h1>
          <p className="mt-2 text-lg font-semibold text-accent">{text.name}</p>
          <p className="mt-4 leading-relaxed text-muted">{ui.thanks.text}</p>
          <p className="mt-3 text-sm text-muted">{fmt(ui.thanks.spam, { email: site.contactEmail })}</p>
        </div>
        <Suspense fallback={<div className="mt-10 h-40 animate-pulse rounded-2xl bg-background" />}>
          <PaidReport locale={locale} slug={def.slug} thanks={ui.thanks} searchParams={searchParams} />
        </Suspense>
        {related.length > 0 && (
          <section className="mt-12">
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
        <div className="mt-10 text-center">
          <Link href={`/${locale}#tests`} className="inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong">
            {ui.thanks.more}
          </Link>
        </div>
      </div>
    </div>
  );
}
