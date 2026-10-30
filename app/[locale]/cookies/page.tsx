import { CookieSettingsButton } from "@/components/CookieConsent";
import { LegalPage, legalMetadata } from "@/components/LegalPage";
import { hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";
import { site } from "@/lib/site";

export function generateMetadata({ params }: PageProps<"/[locale]/cookies">) {
  return legalMetadata(params, "cookies");
}

export default async function Cookies({ params }: PageProps<"/[locale]/cookies">) {
  const { locale } = await params;
  const ui = hasLocale(locale) ? await getUi(locale) : null;
  return (
    <>
      <LegalPage params={params} kind="cookies" />
      {ui && site.gaId && (
        <div className="mx-auto max-w-2xl px-4">
          <CookieSettingsButton label={ui.consent.settings} />
        </div>
      )}
    </>
  );
}
