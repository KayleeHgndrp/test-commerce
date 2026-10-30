"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { fmt } from "@/lib/i18n/fmt";
import type { UiMessages } from "@/lib/i18n/messages";
import { clearCoachCode, getCoachCode, getReferral } from "@/lib/partners";
import { formatPrice } from "@/lib/site";
import { decodeAnswers, scoreTest } from "@/lib/tests/scoring";
import type { TestDefinition } from "@/lib/tests/types";
import { resultKey } from "./Quiz";

type Props = {
  locale: string;
  def: TestDefinition;
  name: string;
  dimensionNames: string[];
  // Name and opening line of each possible main type, shown for free once the visitor's type is known.
  teasers: Record<string, { name: string; text: string }>;
  price: string;
  // Anchor price shown struck through next to the single report price.
  listPrice: string;
  packPrice: string;
  // Saving of the pack against single reports, or null when the pack saves nothing.
  packSave: string | null;
  allPrice: string;
  allCount: number;
  includes: string[];
  ui: UiMessages["result"];
  plansUi: UiMessages["plans"];
  children?: React.ReactNode;
};

type Stored = { answers: string; gender: string };
type PassStatus = { session: string; plan: "pack" | "all"; remaining: number; covered: string[] };
type Plan = "single" | "pack" | "all";

export const passKey = "report-pass";

export function ResultPreview({ locale, def, name, dimensionNames, teasers, price, listPrice, packPrice, packSave, allPrice, allCount, includes, ui, plansUi, children }: Props) {
  const [stored, setStored] = useState<Stored | null | undefined>(undefined);
  const [pass, setPass] = useState<PassStatus | null>(null);
  const [plan, setPlan] = useState<Plan>("single");
  const [coachCode, setCoachCode] = useState<string | null>(null);
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
    setCoachCode(getCoachCode());

    // A pack bought earlier on this device unlocks this report without paying again.
    let session = "";
    try {
      session = (JSON.parse(localStorage.getItem(passKey) ?? "null") as { session?: string } | null)?.session ?? "";
    } catch {}
    if (!session) return;
    fetch(`/api/pass?id=${encodeURIComponent(session)}`)
      .then((res) => (res.ok ? (res.json() as Promise<Omit<PassStatus, "session">>) : null))
      .then((status) => {
        if (status && (status.remaining > 0 || status.covered.includes(def.slug))) setPass({ ...status, session });
      })
      .catch(() => {});
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
  const teaser = result.type ? teasers[result.type] : undefined;

  async function redeem() {
    setError("");
    setBusy(true);
    track("Pass Redeem", { test: def.slug });
    try {
      const res = await fetch("/api/pass", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pass: pass!.session, slug: def.slug, locale, answers: stored!.answers }),
      });
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setPass(null);
      setError(plansUi.passError);
      setBusy(false);
    }
  }

  const planOptions: { id: Plan; title: string; note?: string; price: string; was?: string; badge?: string }[] = [
    { id: "single", title: plansUi.single, price, was: listPrice },
    { id: "pack", title: plansUi.pack, note: plansUi.packNote, price: packPrice, badge: packSave ? fmt(plansUi.save, { amount: packSave }) : undefined },
    { id: "all", title: fmt(plansUi.all, { count: allCount }), note: plansUi.allNote, price: allPrice },
  ];
  const chosen = planOptions.find((o) => o.id === plan)!;

  async function buy(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!consent) return setError(ui.consentRequired);
    setBusy(true);
    track("Checkout Start", { test: def.slug, plan });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: def.slug, locale, answers: stored!.answers, gender: stored!.gender, plan, ref: getReferral(), coachCode: plan === "single" ? coachCode : null }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.error === "code_invalid") {
        clearCoachCode();
        setCoachCode(null);
        setError(ui.codeInvalid);
        setBusy(false);
        return;
      }
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
          {teaser && (
            <div className="mb-6 border-b border-border pb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{ui.mainType}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{teaser.name}</p>
              <p className="mt-2 leading-relaxed">{teaser.text}</p>
              <div className="mt-3 space-y-2" aria-hidden>
                <div className="h-3 w-full rounded bg-border blur-[2px]" />
                <div className="h-3 w-11/12 rounded bg-border blur-[2px]" />
                <div className="h-3 w-3/4 rounded bg-border blur-[2px]" />
              </div>
              <p className="mt-3 text-sm text-muted">{fmt(ui.teaserMore, { count: def.dimensions.length })}</p>
            </div>
          )}
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

        {pass ? (
          <div className="rounded-2xl border-2 border-accent bg-surface p-6 md:col-span-2">
            <h2 className="text-lg font-bold">{pass.plan === "all" ? plansUi.passAll : fmt(plansUi.passPack, { count: pass.remaining })}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{ui.unlockText}</p>
            <button
              onClick={redeem}
              disabled={busy}
              className="mt-5 w-full rounded-lg bg-accent px-5 py-3.5 font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-strong disabled:opacity-60"
            >
              {busy ? "…" : plansUi.passUnlock}
            </button>
          </div>
        ) : (
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
          <fieldset className="mt-5 space-y-2">
            <legend className="text-sm font-medium">{plansUi.title}</legend>
            {planOptions.map((o) => (
              <label
                key={o.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${plan === o.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/60"}`}
              >
                <input type="radio" name="plan" checked={plan === o.id} onChange={() => setPlan(o.id)} className="mt-1 accent-[var(--accent)]" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="font-semibold">{o.title}</span>
                    <span className="whitespace-nowrap">
                      {o.was && <s className="mr-1.5 text-muted">{o.was}</s>}
                      <span className={`font-bold ${o.was ? "text-accent" : ""}`}>{o.price}</span>
                    </span>
                  </span>
                  {o.note && <span className="mt-0.5 block text-xs text-muted">{o.note}</span>}
                  {o.badge && <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">{o.badge}</span>}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="mt-5 flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
            <span>
              <Link href={`/${locale}/terms`} className="underline" target="_blank">{ui.consent}</Link>
            </span>
          </label>
          {coachCode && plan === "single" && <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">{ui.codeApplied}</p>}
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
          <button
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-accent px-5 py-3.5 font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-strong disabled:opacity-60"
          >
            {busy ? "…" : fmt(ui.buy, { price: coachCode && plan === "single" ? formatPrice(locale, 0) : chosen.price })}
          </button>
          <p className="mt-3 text-center text-xs text-muted">✉️ {ui.delivery}</p>
          <p className="mt-1 text-center text-xs text-muted">🔒 {ui.secure}</p>
        </form>
        )}
      </div>
      {children}
    </div>
  );
}
