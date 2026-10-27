import { cacheLife } from "next/cache";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/locales";
import { fmt, type UiMessages } from "@/lib/i18n/messages";
import { site } from "@/lib/site";
import { Logo } from "./Logo";
import { PaymentBadges } from "./PaymentBadges";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer({ locale, ui }: { locale: Locale; ui: UiMessages }) {
  const f = ui.footer;
  const columns: [string, [string, string][]][] = [
    [f.company, [[f.home, `/${locale}`], [ui.nav.tests, `/${locale}#tests`], [ui.nav.pricing, `/${locale}#pricing`], [ui.nav.faq, `/${locale}#faq`]]],
    [f.help, [[f.contact, `/${locale}/contact`], [f.refund, `/${locale}/refund`]]],
    [f.legal, [[f.terms, `/${locale}/terms`], [f.privacy, `/${locale}/privacy`], [f.cookies, `/${locale}/cookies`], [f.refund, `/${locale}/refund`]]],
  ];

  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 pt-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)_auto]">
          <div className="max-w-xs">
            <Logo tagline={f.tagline} />
            <p className="mt-4 text-sm leading-relaxed text-muted">{f.about}</p>
          </div>
          {columns.map(([title, links]) => (
            <div key={title}>
              <h2 className="font-sans text-sm font-semibold tracking-normal">{title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {links.map(([label, href]) => (
                  <li key={label + href}>
                    <Link href={href} className="hover:text-foreground">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <PaymentBadges />
        </div>
        <div className="mt-12 space-y-1.5 border-t border-dashed border-border py-8 text-center text-xs text-muted">
          <p>{fmt(f.rights, { year: await currentYear(), site: site.name })}</p>
          {process.env.NEXT_PUBLIC_COMPANY_DETAILS && <p>{process.env.NEXT_PUBLIC_COMPANY_DETAILS}</p>}
          <p>{fmt(f.disclaimer, { site: site.name })}</p>
        </div>
      </div>
    </footer>
  );
}
