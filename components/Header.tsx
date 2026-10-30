import Link from "next/link";
import { hasPosts } from "@/lib/blog";
import type { Locale } from "@/lib/i18n/locales";
import type { UiMessages } from "@/lib/i18n/messages";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

export function Header({ locale, ui }: { locale: Locale; ui: UiMessages }) {
  const link = "hidden rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-foreground md:block";
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={`/${locale}`} aria-label="Home" className="min-w-0 shrink">
          <Logo tagline={ui.footer.tagline} />
        </Link>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href={`/${locale}#tests`} className={link}>{ui.nav.tests}</Link>
          <Link href={`/${locale}#pricing`} className={link}>{ui.nav.pricing}</Link>
          <Link href={`/${locale}#faq`} className={link}>{ui.nav.faq}</Link>
          {hasPosts(locale) && <Link href={`/${locale}/blog`} className={link}>{ui.blog.title}</Link>}
          <Link href={`/${locale}/about`} className={link}>{ui.footer.aboutLink}</Link>
          <LanguageSwitcher locale={locale} label={ui.nav.language} />
          <Link
            href={`/${locale}#tests`}
            className="hidden rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong sm:block"
          >
            {ui.nav.cta}
          </Link>
        </nav>
      </div>
    </header>
  );
}
