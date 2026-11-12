import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartnerJoin } from "@/components/PartnerJoin";
import { hasLocale } from "@/lib/i18n/locales";
import { linkMinutes } from "@/lib/partner-auth";
import { partnerTexts } from "@/lib/partner-texts";
import { site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/partners/join">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: partnerTexts(locale).portal.joinTitle, robots: { index: false } };
}

export default async function PartnerJoinPage({ params }: PageProps<"/[locale]/partners/join">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = partnerTexts(locale);
  return (
    <div className="mx-auto max-w-xl px-4 pt-16">
      <PartnerJoin
        locale={locale}
        t={t.portal}
        host={site.url.replace(/^https?:\/\//, "")}
        minutes={linkMinutes}
        termsHref={`/${locale}/partners#rules`}
      />
    </div>
  );
}
