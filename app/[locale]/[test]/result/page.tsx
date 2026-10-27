import { ResultPreview } from "@/components/ResultPreview";
import { formatPrice } from "@/lib/site";
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
  return (
    <ResultPreview
      locale={locale}
      def={def}
      name={text.name}
      dimensionNames={def.dimensions.map((d) => text.dimensions[d]?.name ?? d)}
      price={formatPrice(locale)}
      ui={ui.result}
    />
  );
}
