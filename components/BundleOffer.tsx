"use client";

import { useEffect } from "react";
import { bundleKey } from "./ResultPreview";

// Remembers a paid order on this device so the next test's result page can offer
// the bundle price. The checkout API checks the offer again before applying it.
export function BundleOffer({ sessionId, slug, until, title, text }: { sessionId: string; slug: string; until: number; title: string; text: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(bundleKey, JSON.stringify({ session: sessionId, slug, until }));
    } catch {}
  }, [sessionId, slug, until]);

  return (
    <div className="mt-10 rounded-2xl border-2 border-accent bg-background p-6 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg leading-relaxed text-muted">{text}</p>
    </div>
  );
}
