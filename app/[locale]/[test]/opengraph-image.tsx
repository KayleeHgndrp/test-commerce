import { hasLocale } from "@/lib/i18n/locales";
import { getTestText } from "@/lib/i18n/messages";
import { ogImage, ogSize } from "@/lib/og";
import { testStaticParams } from "@/lib/tests/params";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Online test";
export const generateStaticParams = testStaticParams;

export default async function Image({ params }: { params: Promise<{ locale: string; test: string }> }) {
  const { locale, test } = await params;
  const text = await getTestText(hasLocale(locale) ? locale : "en", test);
  return ogImage(text.name, text.tagline);
}
