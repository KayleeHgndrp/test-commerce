"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { priceTest, readPriceVariant } from "@/lib/price-test";

// Fires the "Purchase" goal once per Checkout Session.
export function TrackPurchase({ test, sessionId, amount, currency }: { test: string; sessionId: string; amount: number; currency: string }) {
  useEffect(() => {
    const key = `tracked:${sessionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    const variant = priceTest.active ? readPriceVariant() : null;
    track("Purchase", { test, transaction_id: sessionId, ...(variant && { price_test: priceTest.id, price_variant: variant }) }, { currency: currency.toUpperCase(), amount });
  }, [test, sessionId, amount, currency]);
  return null;
}
