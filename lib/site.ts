export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Personality Reveal",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.CONTACT_FROM_EMAIL || "support@example.com",
  // Legal notice (Impressum) details, required in e.g. Germany and Austria.
  company: {
    name: process.env.COMPANY_NAME ?? "",
    address: (process.env.COMPANY_ADDRESS ?? "").replace(/\\n/g, "\n"),
    registration: process.env.COMPANY_REGISTRATION ?? "",
    vat: process.env.COMPANY_VAT ?? "",
    representative: process.env.COMPANY_REPRESENTATIVE ?? "",
  },
  // Report price in the smallest currency unit (cents).
  priceCents: Number(process.env.NEXT_PUBLIC_REPORT_PRICE_CENTS ?? 395),
  // Price of a second report bought within bundleDays of a paid order.
  bundlePriceCents: Number(process.env.NEXT_PUBLIC_BUNDLE_PRICE_CENTS ?? 195),
  bundleDays: 7,
  // Pack of packSize reports: the one bought now plus credits for other tests.
  packPriceCents: Number(process.env.NEXT_PUBLIC_PACK_PRICE_CENTS ?? 795),
  packSize: 3,
  // One-time pass that unlocks the report of every test.
  allPriceCents: Number(process.env.NEXT_PUBLIC_ALL_PRICE_CENTS ?? 1495),
  // Couple report that compares two people who took the same test.
  couplePriceCents: Number(process.env.NEXT_PUBLIC_COUPLE_PRICE_CENTS ?? 595),
  coupleTests: ["attachment", "love-style", "big-five"],
  // Google Analytics 4 measurement ID. Public by design; loads only after cookie consent.
  gaId: process.env.NEXT_PUBLIC_GA_ID || "G-Z486VT99NP",
  currency: (process.env.NEXT_PUBLIC_REPORT_CURRENCY ?? "eur").toLowerCase(),
};

export function formatPrice(locale: string, cents = site.priceCents) {
  const tag = locale === "no" ? "nb" : locale;
  return new Intl.NumberFormat(tag, { style: "currency", currency: site.currency }).format(
    cents / 100,
  );
}
