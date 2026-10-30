"use client";

import { usePathname, useRouter } from "next/navigation";
import { localeNames, locales, type Locale } from "@/lib/i18n/locales";

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function change(next: string) {
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${next}${rest ? `/${rest}` : ""}`);
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <span aria-hidden className="pointer-events-none absolute left-2.5 text-sm max-[359px]:hidden sm:left-3">🌐</span>
      <select
        value={locale}
        onChange={(e) => change(e.target.value)}
        className="max-w-[8.5rem] appearance-none truncate rounded-lg border border-border bg-surface py-2 pl-8 pr-7 text-sm max-[359px]:pl-3 sm:max-w-none sm:pl-9 sm:pr-8 font-medium text-foreground hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-2.5 text-xs sm:right-3 text-muted">▾</span>
    </label>
  );
}
