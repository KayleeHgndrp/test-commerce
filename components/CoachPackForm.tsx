"use client";

import { useState } from "react";
import type { PartnerTexts } from "@/lib/partner-texts";

type Props = { locale: string; t: Pick<PartnerTexts, "packEmail" | "packButton" | "packNote" | "error" | "invalidEmail"> };

export function CoachPackForm({ locale, t }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function buy(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t.invalidEmail);
    setBusy(true);
    try {
      const res = await fetch("/api/coach-pack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, email }),
      });
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setError(t.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={buy} className="mt-6">
      <label className="block text-sm font-medium" htmlFor="coach-email">{t.packEmail}</label>
      <input
        id="coach-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
      >
        {t.packButton}
      </button>
      <p className="mt-3 text-xs text-muted">{t.packNote}</p>
    </form>
  );
}
