"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Fires the "Purchase" goal once per Checkout Session.
export function TrackPurchase({ test, sessionId, amount, currency }: { test: string; sessionId: string; amount: number; currency: string }) {
  useEffect(() => {
    const key = `tracked:${sessionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    track("Purchase", { test, transaction_id: sessionId }, { currency: currency.toUpperCase(), amount });
  }, [test, sessionId, amount, currency]);
  return null;
}
