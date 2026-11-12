import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartnerDashboard } from "@/components/PartnerDashboard";
import { hasLocale } from "@/lib/i18n/locales";
import { getAllTestTexts } from "@/lib/i18n/messages";
import { partnerTexts } from "@/lib/partner-texts";
import { formatPrice, site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/partners/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: partnerTexts(locale).portal.dashTitle, robots: { index: false } };
}

// The page itself is static; the figures load in the browser from /api/partners/me.
export default async function PartnerDashboardPage({ params }: PageProps<"/[locale]/partners/dashboard">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = partnerTexts(locale);
  const tests = (await getAllTestTexts(locale))
    .map(({ def, text }) => ({ slug: def.slug, name: text.name }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <PartnerDashboard
        locale={locale}
        t={t.portal}
        tests={tests}
        minimum={formatPrice(locale, 2500)}
        blockedText={t.portal.blocked}
        currency={site.currency}
      />
    </div>
  );
}
