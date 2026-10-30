import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/lib/i18n/locales";
import { fmt, getUi } from "@/lib/i18n/messages";
import { metaDescription, pageSeo } from "@/lib/seo";
import { formatPrice, site } from "@/lib/site";

type Kind = "privacy" | "terms" | "cookies" | "refund";

const legalVars = (locale: Locale) => ({ site: site.name, email: site.contactEmail, price: formatPrice(locale) });

export async function legalMetadata(params: Promise<{ locale: string }>, kind: Kind): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { legal } = await getUi(locale);
  return {
    title: legal[`${kind}Title`],
    description: metaDescription(fmt(legal[`${kind}Body`][0], legalVars(locale))),
    ...pageSeo(locale, `/${kind}`),
  };
}

export async function LegalPage({ params, kind }: { params: Promise<{ locale: string }>; kind: Kind }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const { legal } = await getUi(locale);
  const vars = legalVars(locale);
  return (
    <article className="mx-auto max-w-2xl px-4 pt-16">
      <h1 className="text-3xl font-bold tracking-tight">{legal[`${kind}Title`]}</h1>
      {legal[`${kind}Body`].map((p) => (
        <p key={p} className="mt-5 leading-relaxed text-muted">{fmt(p, vars)}</p>
      ))}
    </article>
  );
}
