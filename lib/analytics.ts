// Plausible custom events (no cookies, so no consent banner is needed).
// Does nothing unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set and the script loaded.
type Plausible = (event: string, options?: { props?: Record<string, string>; revenue?: { currency: string; amount: number } }) => void;

export function track(event: string, props?: Record<string, string>, revenue?: { currency: string; amount: number }) {
  const plausible = (window as unknown as { plausible?: Plausible }).plausible;
  plausible?.(event, { props, revenue });
}
