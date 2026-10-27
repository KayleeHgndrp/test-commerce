import { cacheLife } from "next/cache";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/locales";
import { fmt, type UiMessages } from "@/lib/i18n/messages";
import { site } from "@/lib/site";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer({ locale, ui }: { locale: Locale; ui: UiMessages }) {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center text-sm text-muted">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href={`/${locale}/privacy`} className="hover:text-foreground">{ui.footer.privacy}</Link>
          <Link href={`/${locale}/terms`} className="hover:text-foreground">{ui.footer.terms}</Link>
          <a href={`mailto:${site.contactEmail}`} className="hover:text-foreground">{ui.footer.contact}</a>
        </nav>
        <p>{fmt(ui.footer.rights, { year: await currentYear(), site: site.name })}</p>
        {process.env.NEXT_PUBLIC_COMPANY_DETAILS && <p>{process.env.NEXT_PUBLIC_COMPANY_DETAILS}</p>}
        <p className="max-w-2xl">{fmt(ui.footer.disclaimer, { site: site.name })}</p>
      </div>
    </footer>
  );
}
