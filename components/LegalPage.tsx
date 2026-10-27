import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n/locales";
import { fmt, getUi } from "@/lib/i18n/messages";
import { formatPrice, site } from "@/lib/site";

export async function LegalPage({ params, kind }: { params: Promise<{ locale: string }>; kind: "privacy" | "terms" | "cookies" | "refund" }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const { legal } = await getUi(locale);
  const vars = { site: site.name, email: site.contactEmail, price: formatPrice(locale) };
  return (
    <article className="mx-auto max-w-2xl px-4 pt-16">
      <h1 className="text-3xl font-bold tracking-tight">{legal[`${kind}Title`]}</h1>
      {legal[`${kind}Body`].map((p) => (
        <p key={p} className="mt-5 leading-relaxed text-muted">{fmt(p, vars)}</p>
      ))}
    </article>
  );
}
