import { hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";
import { ogImage, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Online tests";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ui = await getUi(hasLocale(locale) ? locale : "en");
  return ogImage(`${ui.home.heroTitle} ${ui.home.heroHighlight}`, ui.meta.description);
}
