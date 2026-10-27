import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, locales } from "@/lib/i18n/locales";
import { fmt, getUi } from "@/lib/i18n/messages";
import { alternates } from "@/lib/seo";
import { formatPrice, site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { about } = await getUi(locale);
  return { title: fmt(about.title, { site: site.name }), description: about.intro, alternates: alternates(locale, "/about") };
}

export default async function About({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const { about } = await getUi(locale);
  const vars = { site: site.name, price: formatPrice(locale), languages: locales.length };
  const card = "rounded-2xl border border-border bg-surface p-6";

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="mx-auto max-w-3xl pb-16 pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{fmt(about.title, vars)}</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">{about.intro}</p>
      </section>

      <section className="rounded-3xl border border-border bg-surface px-6 py-12 sm:px-12">
        <h2 className="text-2xl font-extrabold sm:text-3xl">{about.missionTitle}</h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">{fmt(about.mission, vars)}</p>
      </section>

      <section className="pt-20">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">{about.howTitle}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {about.how.map((item, i) => (
            <div key={item.title} className={card}>
              <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-accent font-display font-bold text-accent">{i + 1}</span>
              <h3 className="mt-4 font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-20">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">{about.valuesTitle}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {about.values.map((item) => (
            <div key={item.title} className={card}>
              <h3 className="font-bold">{fmt(item.title, vars)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{fmt(item.text, vars)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-20 text-center">
        <p className="text-xl font-bold">{about.ctaTitle}</p>
        <Link
          href={`/${locale}#tests`}
          className="mt-6 inline-flex h-12 items-center rounded-lg bg-accent px-7 font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-strong"
        >
          {about.ctaButton} →
        </Link>
      </section>
    </div>
  );
}
