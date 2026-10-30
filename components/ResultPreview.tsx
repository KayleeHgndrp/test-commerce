"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { fmt } from "@/lib/i18n/fmt";
import type { UiMessages } from "@/lib/i18n/messages";
import { decodeAnswers, scoreTest } from "@/lib/tests/scoring";
import type { TestDefinition } from "@/lib/tests/types";
import { resultKey } from "./Quiz";

type Props = {
  locale: string;
  def: TestDefinition;
  name: string;
  dimensionNames: string[];
  price: string;
  includes: string[];
  ui: UiMessages["result"];
};

type Stored = { answers: string; gender: string };

export function ResultPreview({ locale, def, name, dimensionNames, price, includes, ui }: Props) {
  const [stored, setStored] = useState<Stored | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let value: Stored | null = null;
    try {
      const parsed = JSON.parse(localStorage.getItem(resultKey(def.slug)) ?? "null") as Stored | null;
      if (parsed && decodeAnswers(def, parsed.answers)) value = parsed;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored(value);
  }, [def]);

  if (stored === undefined) return <div className="min-h-[60vh]" />;

  if (stored === null) {
    return (
      <div className="mx-auto mt-16 max-w-xl px-4 text-center">
        <p className="text-muted">{ui.noAnswers}</p>
        <Link href={`/${locale}/${def.slug}/start`} className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-white">
          {ui.takeTest}
        </Link>
      </div>
    );
  }

  const result = scoreTest(def, decodeAnswers(def, stored.answers)!);

  async function buy(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(ui.invalidEmail);
    if (!consent) return setError(ui.consentRequired);
    setBusy(true);
    track("Checkout Start", { test: def.slug });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: def.slug, locale, email, answers: stored!.answers, gender: stored!.gender }),
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
    <div className="mx-auto max-w-3xl px-4 pt-12">
      {result.crisis && (
        <div role="alert" className="mb-8 rounded-2xl border-2 border-rose-400 bg-rose-50 p-6 text-rose-950">
          <h2 className="text-lg font-bold">{ui.crisisTitle}</h2>
          <p className="mt-2 leading-relaxed">{ui.crisisText}</p>
          <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold underline">
            {ui.crisisLink} →
          </a>
        </div>
      )}

      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{ui.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">{fmt(ui.subtitle, { test: name })}</p>
      </div>

      <div className="mt-10 grid items-start gap-6 md:grid-cols-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 md:col-span-3">
          <ul className="space-y-4" aria-hidden>
            {result.scores.slice(0, 8).map((score, i) => (
              <li key={score.dim}>
                <div className="flex justify-between text-sm font-medium">
                  <span>{dimensionNames[i]}</span>
                  <span className="select-none blur-sm">{score.percent}%</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-accent blur-[3px]" style={{ width: `${30 + ((i * 37) % 60)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-gradient-to-t from-surface pb-4">
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">🔒 {ui.locked}</span>
          </div>
        </div>

        <form onSubmit={buy} className="rounded-2xl border-2 border-accent bg-surface p-6 md:col-span-2">
          <h2 className="text-lg font-bold">{ui.unlockTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{ui.unlockText}</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed">
            {includes.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-accent">✓</span>
                {line}
              </li>
            ))}
          </ul>
          <label className="mt-5 block text-sm font-medium" htmlFor="email">{ui.emailLabel}</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={ui.emailPlaceholder}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <label className="mt-4 flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
            <span>
              <Link href={`/${locale}/terms`} className="underline" target="_blank">{ui.consent}</Link>
            </span>
          </label>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
          <button
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-accent px-5 py-3.5 font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-strong disabled:opacity-60"
          >
            {busy ? "…" : fmt(ui.buy, { price })}
          </button>
          <p className="mt-3 text-center text-xs text-muted">🔒 {ui.secure}</p>
        </form>
      </div>
    </div>
  );
}
