import Link from "next/link";
import type { Locale } from "@/lib/i18n/locales";
import type { UiMessages } from "@/lib/i18n/messages";
import { site } from "@/lib/site";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({ locale, ui }: { locale: Locale; ui: UiMessages }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={`/${locale}`} className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">✦</span>
          {site.name}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
          <Link href={`/${locale}#tests`} className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-foreground sm:block">
            {ui.nav.tests}
          </Link>
          <Link href={`/${locale}#faq`} className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-foreground sm:block">
            {ui.nav.faq}
          </Link>
          <LanguageSwitcher locale={locale} label={ui.nav.language} />
        </nav>
      </div>
    </header>
  );
}
