"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import {
  AL, BG, CZ, DE, DK, EE, ES, FI, FR, GB, GR, HR, HU, IE, IS, IT, LT, LV, MK, MT, NL, NO, PL, PT, RO, RS, SE, SI, SK, TR, UA,
} from "country-flag-icons/react/3x2";
import { localeNames, locales, type Locale } from "@/lib/i18n/locales";

type Flag = ComponentType<SVGProps<SVGSVGElement>>;

// Catalonia has no country flag, so the Senyera is drawn here.
function Catalonia(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 9 6" {...props}>
      <rect width="9" height="6" fill="#FCDD09" />
      {[1, 2, 3, 4].map((i) => (
        <rect key={i} y={((2 * i - 1) * 6) / 9} width="9" height={6 / 9} fill="#DA121A" />
      ))}
    </svg>
  );
}

const flags = {
  en: GB, nl: NL, de: DE, fr: FR, es: ES, it: IT, pt: PT, pl: PL, ro: RO, cs: CZ, sk: SK, hu: HU,
  sv: SE, da: DK, fi: FI, et: EE, lv: LV, lt: LT, el: GR, bg: BG, hr: HR, sl: SI, ga: IE, mt: MT,
  no: NO, is: IS, uk: UA, tr: TR, sr: RS, sq: AL, mk: MK, ca: Catalonia,
} as Record<Locale, Flag>;

function rememberLocale(locale: Locale) {
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>("[aria-current=true]")?.scrollIntoView({ block: "nearest" });
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function change(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    rememberLocale(next);
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${next}${rest ? `/${rest}` : ""}`);
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-xl bg-border/70 px-3 text-sm font-bold text-foreground transition hover:bg-border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px] text-muted">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
        </svg>
        <span>{locale.toUpperCase()}</span>
        <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      {open && (
        <ul
          ref={list}
          aria-label={label}
          className="absolute right-0 top-full z-30 mt-2 max-h-[min(26rem,70vh)] w-60 overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-xl shadow-black/5"
        >
          {locales.map((l) => {
            const Flag = flags[l];
            const active = l === locale;
            return (
              <li key={l}>
                <button
                  type="button"
                  lang={l}
                  aria-current={active}
                  onClick={() => change(l)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition ${active ? "bg-accent-soft text-accent" : "text-foreground hover:bg-background"}`}
                >
                  <Flag aria-hidden className="h-4 w-6 shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
                  <span className="flex-1 truncate">{localeNames[l]}</span>
                  <span className={`text-xs font-bold tracking-wide ${active ? "text-accent" : "text-muted"}`}>{l.toUpperCase()}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
