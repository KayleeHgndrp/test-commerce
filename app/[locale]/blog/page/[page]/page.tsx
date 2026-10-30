import { notFound } from "next/navigation";
import { BlogIndex, blogIndexMetadata } from "@/components/BlogIndex";
import { blogPageCount } from "@/lib/blog";
import { locales } from "@/lib/i18n/locales";

// Every page is fully prerendered per locale, so blocking on params costs nothing.
export const instant = false;

export function generateStaticParams() {
  const params = locales.flatMap((locale) =>
    Array.from({ length: blogPageCount(locale) - 1 }, (_, i) => ({ locale, page: String(i + 2) })),
  );
  // Cache Components needs at least one param; this one renders a 404.
  return params.length ? params : [{ locale: "en", page: "2" }];
}

const pageNumber = (value: string) => (/^[2-9]$|^[1-9]\d+$/.test(value) ? Number(value) : NaN);

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/page/[page]">) {
  const { locale, page } = await params;
  return blogIndexMetadata(locale, pageNumber(page));
}

export default async function BlogPage({ params }: PageProps<"/[locale]/blog/page/[page]">) {
  const { locale, page } = await params;
  const n = pageNumber(page);
  if (Number.isNaN(n)) notFound();
  return <BlogIndex locale={locale} page={n} />;
}
