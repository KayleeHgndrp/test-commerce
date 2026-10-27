import { LegalPage } from "@/components/LegalPage";
import { hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getUi(locale)).legal.privacyTitle } : {};
}

export default function Privacy({ params }: PageProps<"/[locale]/privacy">) {
  return <LegalPage params={params} kind="privacy" />;
}
