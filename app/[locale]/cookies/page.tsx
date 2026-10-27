import { LegalPage } from "@/components/LegalPage";
import { hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";

export async function generateMetadata({ params }: PageProps<"/[locale]/cookies">) {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getUi(locale)).legal.cookiesTitle } : {};
}

export default function Cookies({ params }: PageProps<"/[locale]/cookies">) {
  return <LegalPage params={params} kind="cookies" />;
}
