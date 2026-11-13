"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { getReferral } from "@/lib/partners";
import { passKey } from "./ResultPreview";

type Texts = { title: string; text: string; button: string; note: string; error: string };

// Shown under a single report on the thanks page: the all-access pass for the
// difference with what was just paid. Hidden when this device already has a pass.
export function UpgradeOffer({ locale, slug, sessionId, answers, gender, ui }: { locale: string; slug: string; sessionId: string; answers: string; gender: string; ui: Texts }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let hasPass = false;
    try {
      hasPass = Boolean(localStorage.getItem(passKey));
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(!hasPass);
    if (!hasPass) track("Upgrade View", { test: slug });
  }, [slug]);

  if (!show) return null;

  async function upgrade() {
    setError("");
    setBusy(true);
    track("Upgrade Start", { test: slug });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, locale, answers, gender, plan: "all", upgradeFrom: sessionId, ref: getReferral() }),
      });
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setError(ui.error);
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border-2 border-accent bg-background p-6 text-center">
      <h2 className="text-xl font-bold">{ui.title}</h2>
      <p className="mx-auto mt-2 max-w-lg leading-relaxed text-muted">{ui.text}</p>
      <button
        onClick={upgrade}
        disabled={busy}
        className="mt-5 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-strong disabled:opacity-60"
      >
        {busy ? "…" : ui.button}
      </button>
      <p className="mt-3 text-xs text-muted">{ui.note}</p>
      {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
    </div>
  );
}
