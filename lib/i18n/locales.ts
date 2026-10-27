export const locales = [
  "en", "nl", "de", "fr", "es", "it", "pt", "pl", "ro", "cs", "sk", "hu",
  "sv", "da", "fi", "et", "lv", "lt", "el", "bg", "hr", "sl", "ga", "mt",
  "no", "is", "uk", "tr", "sr", "sq", "mk", "ca",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Native language names, shown in the language switcher.
export const localeNames: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  pl: "Polski",
  ro: "Română",
  cs: "Čeština",
  sk: "Slovenčina",
  hu: "Magyar",
  sv: "Svenska",
  da: "Dansk",
  fi: "Suomi",
  et: "Eesti",
  lv: "Latviešu",
  lt: "Lietuvių",
  el: "Ελληνικά",
  bg: "Български",
  hr: "Hrvatski",
  sl: "Slovenščina",
  ga: "Gaeilge",
  mt: "Malti",
  no: "Norsk",
  is: "Íslenska",
  uk: "Українська",
  tr: "Türkçe",
  sr: "Srpski",
  sq: "Shqip",
  mk: "Македонски",
  ca: "Català",
};

// BCP 47 tags for <html lang> and hreflang where the URL segment differs.
export const localeTags: Partial<Record<Locale, string>> = {
  no: "nb",
  sr: "sr-Latn",
};

export const toLangTag = (locale: Locale) => localeTags[locale] ?? locale;

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
