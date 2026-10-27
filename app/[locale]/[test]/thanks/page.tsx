import Link from "next/link";
import { fmt } from "@/lib/i18n/messages";
import { site } from "@/lib/site";
import { loadTestPage, testStaticParams } from "@/lib/tests/params";

export const generateStaticParams = testStaticParams;
// Every test page is fully prerendered per locale/test, so blocking on params costs nothing.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/[test]/thanks">) {
  const { ui } = await loadTestPage(params);
  return { title: ui.thanks.title, robots: { index: false } };
}

export default async function ThanksPage({ params }: PageProps<"/[locale]/[test]/thanks">) {
  const { locale, ui } = await loadTestPage(params);
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-border bg-surface p-10 text-center">
      <span className="text-5xl" aria-hidden>📬</span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{ui.thanks.title}</h1>
      <p className="mt-4 leading-relaxed text-muted">{ui.thanks.text}</p>
      <p className="mt-4 text-sm text-muted">{fmt(ui.thanks.spam, { email: site.contactEmail })}</p>
      <Link href={`/${locale}#tests`} className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong">
        {ui.thanks.more}
      </Link>
    </div>
  );
}
