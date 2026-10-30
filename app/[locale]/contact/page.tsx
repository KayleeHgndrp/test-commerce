import { notFound } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { hasLocale } from "@/lib/i18n/locales";
import { getUi } from "@/lib/i18n/messages";
import { pageSeo } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { contact } = await getUi(locale);
  return { title: contact.title, description: contact.subtitle, ...pageSeo(locale, "/contact") };
}

export default async function Contact({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const { contact } = await getUi(locale);
  return (
    <div className="mx-auto max-w-xl px-4 pt-16">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{contact.title}</h1>
        <p className="mt-3 text-muted">{contact.subtitle}</p>
      </div>
      <div className="mt-10 rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <ContactForm locale={locale} ui={contact} />
      </div>
    </div>
  );
}
