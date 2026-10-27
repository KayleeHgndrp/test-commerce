import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { Analytics } from "@/components/Analytics";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { hasLocale, locales, toLangTag } from "@/lib/i18n/locales";
import { fmt, getUi } from "@/lib/i18n/messages";
import { formatPrice, site } from "@/lib/site";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "greek", "cyrillic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  weight: ["600", "700", "800"],
  subsets: ["latin", "latin-ext", "greek", "cyrillic"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const ui = await getUi(locale);
  const vars = { site: site.name, price: formatPrice(locale) };
  return {
    metadataBase: new URL(site.url),
    title: { default: fmt(ui.meta.title, vars), template: `%s | ${site.name}` },
    description: fmt(ui.meta.description, vars),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const ui = await getUi(locale);

  return (
    <html lang={toLangTag(locale)} className={`${inter.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header locale={locale} ui={ui} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} ui={ui} />
        <Analytics />
      </body>
    </html>
  );
}
