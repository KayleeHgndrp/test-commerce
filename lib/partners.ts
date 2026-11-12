// Partner attribution in the browser. A partner link carries ?ref=<partner>, an
// affiliate who earns commission on the sale. The referral is kept for the visit
// in memory, and outlives the visit only when the visitor accepted cookies.
import { readConsent } from "@/lib/analytics";
import { site } from "@/lib/site";

export const refPattern = /^[a-z0-9-]{2,32}$/;

const refKey = "partner-ref";

let ref: string | null = null;

export function capturePartnerParams(search: string) {
  const newRef = new URLSearchParams(search).get("ref")?.toLowerCase();
  if (!newRef || !refPattern.test(newRef)) return;
  ref = newRef;
  if (readConsent() === "granted") {
    try {
      localStorage.setItem(refKey, JSON.stringify({ ref: newRef, until: Date.now() + site.affiliateDays * 86400000 }));
    } catch {}
  }
}

export function getReferral(): string | null {
  if (ref) return ref;
  try {
    const saved = JSON.parse(localStorage.getItem(refKey) ?? "null") as { ref: string; until: number } | null;
    if (saved && saved.until > Date.now() && refPattern.test(saved.ref)) return saved.ref;
  } catch {}
  return null;
}
