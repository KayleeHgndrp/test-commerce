// A/B price test for the single report. Both variants share the same list price;
// variant "b" shows that list price struck through with a discount.
// Shared by the browser (assignment, display) and the checkout route (charging).
export const priceTest = {
  id: "report-price-2026-11",
  active: true,
  listCents: 325,
  variants: { a: 325, b: 199 } as const,
};

export type PriceVariant = keyof typeof priceTest.variants;

export function isPriceVariant(value: unknown): value is PriceVariant {
  return typeof value === "string" && Object.hasOwn(priceTest.variants, value);
}

// Price of a single report in the given variant. Without a valid variant the list price applies.
export function variantPriceCents(variant: unknown): number {
  return priceTest.active && isPriceVariant(variant) ? priceTest.variants[variant] : priceTest.listCents;
}

const storageKey = `price-variant:${priceTest.id}`;

// Returns the visitor's variant, assigning one at random (50/50) on the first visit.
// The choice is kept in localStorage and a cookie so a visitor always sees the same price.
export function getPriceVariant(): PriceVariant {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {}
  if (!isPriceVariant(stored)) {
    const match = document.cookie.match(/(?:^|; )price_variant=([^;]+)/);
    stored = match ? decodeURIComponent(match[1]) : null;
  }
  const variant: PriceVariant = isPriceVariant(stored) ? stored : Math.random() < 0.5 ? "a" : "b";
  try {
    localStorage.setItem(storageKey, variant);
  } catch {}
  document.cookie = `price_variant=${variant}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
  return variant;
}

// Variant already assigned to this visitor, without assigning a new one.
export function readPriceVariant(): PriceVariant | null {
  try {
    const stored = localStorage.getItem(storageKey);
    return isPriceVariant(stored) ? stored : null;
  } catch {
    return null;
  }
}
