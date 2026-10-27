export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Testora",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.CONTACT_FROM_EMAIL || "support@example.com",
  // Report price in the smallest currency unit (cents).
  priceCents: Number(process.env.NEXT_PUBLIC_REPORT_PRICE_CENTS ?? 125),
  currency: (process.env.NEXT_PUBLIC_REPORT_CURRENCY ?? "eur").toLowerCase(),
};

export function formatPrice(locale: string) {
  const tag = locale === "no" ? "nb" : locale;
  return new Intl.NumberFormat(tag, { style: "currency", currency: site.currency }).format(
    site.priceCents / 100,
  );
}
