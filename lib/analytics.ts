// Analytics events go to Plausible (cookieless) and, once the visitor has accepted
// cookies, to Google Analytics 4. Both are no-ops until their script is configured.
type Plausible = (event: string, options?: { props?: Record<string, string>; revenue?: { currency: string; amount: number } }) => void;
type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = { plausible?: Plausible; gtag?: Gtag; dataLayer?: unknown[] };

const gaEvents: Record<string, string> = {
  "Test Start": "test_start",
  "Test Complete": "test_complete",
  "Checkout Start": "begin_checkout",
  Purchase: "purchase",
  "Email Signup": "sign_up",
};

export function track(event: string, props?: Record<string, string>, revenue?: { currency: string; amount: number }) {
  const w = window as unknown as AnalyticsWindow;
  w.plausible?.(event, { props, revenue });
  w.gtag?.("event", gaEvents[event] ?? event, { ...props, ...(revenue && { currency: revenue.currency, value: revenue.amount }) });
}

export const consentKey = "cookie-consent";
export type Consent = "granted" | "denied";

export function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(consentKey);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent | null) {
  try {
    if (value) localStorage.setItem(consentKey, value);
    else localStorage.removeItem(consentKey);
  } catch {}
}

// Loads gtag.js. Only called after the visitor accepted analytics cookies.
export function loadGoogleAnalytics(id: string) {
  const w = window as unknown as AnalyticsWindow;
  if (w.gtag) return;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // gtag.js expects the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  w.gtag("js", new Date());
  w.gtag("config", id);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}
