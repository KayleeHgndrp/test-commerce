"use client";

import { useEffect } from "react";
import { bundleKey } from "./ResultPreview";

// The bundle email links to ?offer=<session>.<slug>.<until>. Storing it here lets
// the next result page show the bundle price on any device; the checkout API
// still checks the offer with Stripe before applying it.
export function OfferFromLink() {
  useEffect(() => {
    const offer = new URLSearchParams(window.location.search).get("offer");
    const match = offer?.match(/^(cs_[A-Za-z0-9_]+)\.([a-z0-9-]+)\.(\d+)$/);
    if (!match || Number(match[3]) < Date.now()) return;
    try {
      localStorage.setItem(bundleKey, JSON.stringify({ session: match[1], slug: match[2], until: Number(match[3]) }));
    } catch {}
  }, []);
  return null;
}
