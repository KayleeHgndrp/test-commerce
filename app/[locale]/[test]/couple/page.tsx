import { notFound } from "next/navigation";
import { CoupleMatch } from "@/components/CoupleMatch";
import { locales } from "@/lib/i18n/locales";
import { formatPrice, site } from "@/lib/site";
import { loadTestPage } from "@/lib/tests/params";

export const generateStaticParams = () => locales.flatMap((locale) => site.coupleTests.map((test) => ({ locale, test })));
// Every couple page is fully prerendered per locale/test, so blocking on params costs nothing.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/[test]/couple">) {
  const { ui, text } = await loadTestPage(params);
  return { title: `${text.name} · ${ui.couple.matchTitle}`, robots: { index: false } };
}

export default async function CouplePage({ params }: PageProps<"/[locale]/[test]/couple">) {
  const { locale, def, ui, text } = await loadTestPage(params);
  if (!site.coupleTests.includes(def.slug)) notFound();
  return (
    <CoupleMatch
      locale={locale}
      def={def}
      testName={text.name}
      dimensionNames={def.dimensions.map((d) => text.dimensions[d]?.name ?? d)}
      price={formatPrice(locale, site.couplePriceCents)}
      ui={ui.couple}
      resultUi={ui.result}
    />
  );
}
