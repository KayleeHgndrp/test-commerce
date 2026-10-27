import { LegalPage } from "@/components/LegalPage";
import { hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";

export async function generateMetadata({ params }: PageProps<"/[locale]/refund">) {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getUi(locale)).legal.refundTitle } : {};
}

export default function Refund({ params }: PageProps<"/[locale]/refund">) {
  return <LegalPage params={params} kind="refund" />;
}
