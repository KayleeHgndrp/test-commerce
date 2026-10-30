import { CoupleInvite } from "@/components/CoupleInvite";
import { ResultPreview } from "@/components/ResultPreview";
import { allDefinitions, fmt } from "@/lib/i18n/messages";
import { formatPrice, site } from "@/lib/site";
import { loadTestPage, testStaticParams } from "@/lib/tests/params";

export const generateStaticParams = testStaticParams;
// Every test page is fully prerendered per locale/test, so blocking on params costs nothing.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/[test]/result">) {
  const { text } = await loadTestPage(params);
  return { title: text.name, robots: { index: false } };
}

export default async function ResultPage({ params }: PageProps<"/[locale]/[test]/result">) {
  const { locale, def, ui, text } = await loadTestPage(params);
  const dimensionNames = def.dimensions.map((d) => text.dimensions[d]?.name ?? d);
  return (
    <ResultPreview
      locale={locale}
      def={def}
      name={text.name}
      dimensionNames={dimensionNames}
      price={formatPrice(locale)}
      bundlePrice={formatPrice(locale, site.bundlePriceCents)}
      packPrice={formatPrice(locale, site.packPriceCents)}
      packSave={formatPrice(locale, site.packSize * site.priceCents - site.packPriceCents)}
      allPrice={formatPrice(locale, site.allPriceCents)}
      allCount={allDefinitions.length}
      includes={[fmt(ui.test.whatYouGet1, { dimensions: dimensionNames.join(", ") }), ui.test.whatYouGet2, ui.test.whatYouGet3]}
      ui={ui.result}
      plansUi={ui.plans}
    >
      {site.coupleTests.includes(def.slug) && <CoupleInvite locale={locale} slug={def.slug} testName={text.name} ui={ui.couple} />}
    </ResultPreview>
  );
}
