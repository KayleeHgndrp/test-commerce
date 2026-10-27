import { LegalPage } from "@/components/LegalPage";
import { hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";

export async function generateMetadata({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getUi(locale)).legal.termsTitle } : {};
}

export default function Terms({ params }: PageProps<"/[locale]/terms">) {
  return <LegalPage params={params} kind="terms" />;
}
