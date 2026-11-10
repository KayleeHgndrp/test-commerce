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

function firstSentence(text: string) {
  const match = text.match(/^.+?[.!?。](?=\s|$)/u);
  return match ? match[0] : text;
}

export default async function ResultPage({ params }: PageProps<"/[locale]/[test]/result">) {
  const { locale, def, ui, text } = await loadTestPage(params);
  const dimensionNames = def.dimensions.map((d) => text.dimensions[d]?.name ?? d);
  // Free preview of the main type: its name and one opening line. The rest stays in the paid report.
  const teasers: Record<string, { name: string; text: string }> = {};
  if (def.outcome === "top") {
    for (const d of def.dimensions) teasers[d] = { name: text.dimensions[d].name, text: text.dimensions[d].short };
  } else if (text.types) {
    for (const [key, t] of Object.entries(text.types)) {
      teasers[key] = { name: def.outcome === "axes" ? `${key}: ${t.name}` : t.name, text: firstSentence(t.text) };
    }
  }
  return (
    <ResultPreview
      locale={locale}
      def={def}
      name={text.name}
      dimensionNames={dimensionNames}
      teasers={teasers}
      price={formatPrice(locale)}
      listPrice={formatPrice(locale, site.listPriceCents)}
      bundlePrice={formatPrice(locale, site.bundlePriceCents)}
      packPrice={formatPrice(locale, site.packPriceCents)}
      packSave={site.packSize * site.priceCents > site.packPriceCents ? formatPrice(locale, site.packSize * site.priceCents - site.packPriceCents) : null}
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
