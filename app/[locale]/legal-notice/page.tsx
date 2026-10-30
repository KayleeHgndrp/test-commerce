import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";
import { pageSeo } from "@/lib/seo";
import { site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/legal-notice">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { legal } = await getUi(locale);
  return {
    title: legal.noticeTitle,
    description: `${legal.noticeTitle}: ${site.company.name || site.name}`,
    ...pageSeo(locale, "/legal-notice"),
  };
}

export default async function LegalNotice({ params }: PageProps<"/[locale]/legal-notice">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const { legal } = await getUi(locale);
  const n = legal.notice;
  const rows: [string, string][] = [
    [n.company, site.company.name || site.name],
    [n.address, site.company.address],
    [n.representative, site.company.representative],
    [n.registration, site.company.registration],
    [n.vat, site.company.vat],
    [n.contact, site.contactEmail],
  ];

  return (
    <article className="mx-auto max-w-2xl px-4 pt-16">
      <h1 className="text-3xl font-bold tracking-tight">{legal.noticeTitle}</h1>
      <dl className="mt-8 divide-y divide-border rounded-2xl border border-border bg-surface">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-semibold">{label}</dt>
              <dd className="whitespace-pre-line text-sm text-muted sm:col-span-2">{value}</dd>
            </div>
          ))}
      </dl>
    </article>
  );
}
