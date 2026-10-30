"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadGoogleAnalytics, readConsent, saveConsent, type Consent } from "@/lib/analytics";
import type { UiMessages } from "@/lib/i18n/messages";

const gaId = process.env.NEXT_PUBLIC_GA_ID;

// Asks for permission before Google Analytics sets any cookie (required in the EU).
export function CookieConsent({ locale, ui, policy }: { locale: string; ui: UiMessages["consent"]; policy: string }) {
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!gaId) return;
    const consent = readConsent();
    if (consent === "granted") loadGoogleAnalytics(gaId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else if (consent === null) setAsk(true);
  }, []);

  if (!ask) return null;

  function choose(value: Consent) {
    saveConsent(value);
    if (value === "granted") loadGoogleAnalytics(gaId!);
    setAsk(false);
  }

  return (
    <div role="dialog" aria-live="polite" className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-xl shadow-black/10 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-relaxed text-muted">
          {ui.text}{" "}
          <Link href={`/${locale}/cookies`} className="underline">{policy}</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => choose("denied")} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:border-accent/50">
            {ui.decline}
          </button>
          <button onClick={() => choose("granted")} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong">
            {ui.accept}
          </button>
        </div>
      </div>
    </div>
  );
}

// Lets visitors withdraw or change their choice: clears it and reloads so the banner shows again.
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => {
        saveConsent(null);
        window.location.reload();
      }}
      className="mt-8 rounded-lg border border-border px-5 py-3 text-sm font-semibold hover:border-accent/50"
    >
      {label}
    </button>
  );
}
