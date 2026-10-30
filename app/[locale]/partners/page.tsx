import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoachPackForm } from "@/components/CoachPackForm";
import { hasLocale, toLangTag } from "@/lib/i18n/locales";
import { partnerLocales, partnerTexts } from "@/lib/partner-texts";
import { site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/partners">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = partnerTexts(locale);
  const translated = (partnerLocales as readonly string[]).includes(locale);
  return {
    title: t.title,
    description: t.metaDescription,
    robots: { index: translated },
    alternates: {
      canonical: `${site.url}/${translated ? locale : "en"}/partners`,
      languages: Object.fromEntries(partnerLocales.map((l) => [toLangTag(l), `${site.url}/${l}/partners`])),
    },
  };
}

export default async function Partners({ params }: PageProps<"/[locale]/partners">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = partnerTexts(locale);
  const card = "rounded-2xl border border-border bg-surface p-6 sm:p-8";

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="mx-auto max-w-3xl pb-12 pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t.title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">{t.intro}</p>
      </section>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className={card}>
          <h2 className="text-2xl font-extrabold">{t.affiliateTitle}</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed">
            {t.affiliatePoints.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="text-accent">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-muted">{t.affiliateCta}</p>
        </section>

        <section className={`${card} border-2 border-accent`}>
          <h2 className="text-2xl font-extrabold">{t.packTitle}</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">{t.packText}</p>
          <CoachPackForm locale={locale} t={t} />
        </section>
      </div>

      <section className="mx-auto max-w-3xl pt-16">
        <h2 className="text-xl font-bold">{t.termsTitle}</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {t.terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
