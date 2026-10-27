import { Quiz } from "@/components/Quiz";
import { loadTestPage, testStaticParams } from "@/lib/tests/params";

export const generateStaticParams = testStaticParams;
// Every test page is fully prerendered per locale/test, so blocking on params costs nothing.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/[test]/start">) {
  const { text } = await loadTestPage(params);
  return { title: text.name, robots: { index: false } };
}

export default async function StartPage({ params }: PageProps<"/[locale]/[test]/start">) {
  const { locale, def, ui, text } = await loadTestPage(params);
  return (
    <Quiz
      locale={locale}
      slug={def.slug}
      name={text.name}
      items={text.items}
      scaleType={def.scale}
      scale={ui.scales[def.scale]}
      ui={ui.test}
    />
  );
}
