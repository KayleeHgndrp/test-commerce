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

// Open Graph locales (language_TERRITORY).
export const ogLocales: Record<Locale, string> = {
  en: "en_GB", nl: "nl_NL", de: "de_DE", fr: "fr_FR", es: "es_ES", it: "it_IT", pt: "pt_PT", pl: "pl_PL",
  ro: "ro_RO", cs: "cs_CZ", sk: "sk_SK", hu: "hu_HU", sv: "sv_SE", da: "da_DK", fi: "fi_FI", et: "et_EE",
  lv: "lv_LV", lt: "lt_LT", el: "el_GR", bg: "bg_BG", hr: "hr_HR", sl: "sl_SI", ga: "ga_IE", mt: "mt_MT",
  no: "nb_NO", is: "is_IS", uk: "uk_UA", tr: "tr_TR", sr: "sr_RS", sq: "sq_AL", mk: "mk_MK", ca: "ca_ES",
};

export const toLangTag = (locale: Locale) => localeTags[locale] ?? locale;

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
