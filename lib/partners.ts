// Partner attribution in the browser. A partner link carries ?ref=<partner> (an
// affiliate who earns commission on the sale) or ?code=<coach code> (a report a
// coach prepaid for this visitor). Both are kept for the visit in memory. The
// referral outlives the visit only when the visitor accepted cookies; the code
// is the visitor's own voucher, so it is kept like the bundle offer.
import { readConsent } from "@/lib/analytics";

export const refPattern = /^[a-z0-9-]{2,32}$/;
export const coachCodePattern = /^C-[A-Za-z0-9]{8,64}-\d{1,2}-[a-f0-9]{10}$/;

const refKey = "partner-ref";
const codeKey = "coach-code";
const refDays = 60;

let ref: string | null = null;
let code: string | null = null;

export function capturePartnerParams(search: string) {
  const params = new URLSearchParams(search);
  const newRef = params.get("ref")?.toLowerCase();
  const newCode = params.get("code");
  if (newRef && refPattern.test(newRef)) {
    ref = newRef;
    if (readConsent() === "granted") {
      try {
        localStorage.setItem(refKey, JSON.stringify({ ref: newRef, until: Date.now() + refDays * 86400000 }));
      } catch {}
    }
  }
  if (newCode && coachCodePattern.test(newCode)) {
    code = newCode;
    try {
      localStorage.setItem(codeKey, newCode);
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

export function getCoachCode(): string | null {
  if (code) return code;
  try {
    const saved = localStorage.getItem(codeKey);
    if (saved && coachCodePattern.test(saved)) return saved;
  } catch {}
  return null;
}

export function clearCoachCode() {
  code = null;
  try {
    localStorage.removeItem(codeKey);
  } catch {}
}
