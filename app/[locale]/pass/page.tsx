import Link from "next/link";
import { notFound } from "next/navigation";
import { PassSaver } from "@/components/PassSaver";
import { hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";

export async function generateMetadata({ params }: PageProps<"/[locale]/pass">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { passPage } = await getUi(locale);
  return { title: passPage.title, robots: { index: false } };
}

// Landing page of the link in a pack email: activates the pack on this device.
export default async function PassPage({ params }: PageProps<"/[locale]/pass">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const { passPage, thanks } = await getUi(locale);
  return (
    <div className="mx-auto mt-16 max-w-xl px-4 text-center">
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-bold">{passPage.title}</h1>
        <div className="mt-4">
          <PassSaver ok={passPage.text} invalid={passPage.invalid} />
        </div>
        <Link href={`/${locale}#tests`} className="mt-8 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong">
          {thanks.more}
        </Link>
      </div>
    </div>
  );
}
