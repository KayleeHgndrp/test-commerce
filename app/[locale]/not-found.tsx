import Link from "next/link";
import { locale as rootLocale } from "next/root-params";
import { defaultLocale, hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";

export default async function NotFound() {
  const value = await rootLocale();
  const locale = value && hasLocale(value) ? value : defaultLocale;
  const { notFound } = await getUi(locale);
  return (
    <div className="mx-auto mt-24 max-w-md px-4 text-center">
      <p className="font-display text-6xl font-extrabold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold">{notFound.title}</h1>
      <p className="mt-3 text-muted">{notFound.text}</p>
      <Link href={`/${locale}`} className="mt-8 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong">
        {notFound.home}
      </Link>
    </div>
  );
}
