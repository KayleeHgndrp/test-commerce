"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { fmt } from "@/lib/i18n/fmt";
import type { UiMessages } from "@/lib/i18n/messages";
import { cleanName, coupleMatch } from "@/lib/tests/couple";
import { decodeAnswers } from "@/lib/tests/scoring";
import type { TestDefinition } from "@/lib/tests/types";
import { coupleKey, resultKey } from "./Quiz";

type Props = {
  locale: string;
  def: TestDefinition;
  testName: string;
  dimensionNames: string[];
  price: string;
  ui: UiMessages["couple"];
  resultUi: UiMessages["result"];
};

// The two answer sets come from the link: the inviter's (a, n) and, when the
// partner sends the match back, the partner's own (b, m). Without b the
// visitor is the invited partner and their answers come from this browser.
type Pair = { mine: string; theirs: string; otherName: string; gender: string; invited: boolean };

export function CoupleMatch({ locale, def, testName, dimensionNames, price, ui, resultUi }: Props) {
  const [pair, setPair] = useState<Pair | null | "invalid" | "start" | undefined>(undefined);
  const [inviter, setInviter] = useState("");
  const [myName, setMyName] = useState("");
  const [copied, setCopied] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const a = q.get("a") ?? "";
    const b = q.get("b") ?? "";
    const valid = (s: string) => Boolean(s && decodeAnswers(def, s));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInviter(cleanName(q.get("n")));
    if (!valid(a)) return setPair("invalid");
    if (valid(b)) return setPair({ mine: a, theirs: b, otherName: cleanName(q.get("m")), gender: "other", invited: false });
    let own: { answers?: string; gender?: string } | null = null;
    try {
      own = JSON.parse(localStorage.getItem(resultKey(def.slug)) ?? "null");
    } catch {}
    if (!own?.answers || !valid(own.answers)) return setPair("start");
    setPair({ mine: own.answers, theirs: a, otherName: cleanName(q.get("n")), gender: own.gender ?? "other", invited: true });
  }, [def]);

  if (pair === undefined) return <div className="min-h-[60vh]" />;

  const panel = "mx-auto mt-12 max-w-xl rounded-3xl border border-border bg-surface p-8 text-center";

  if (pair === "invalid") {
    return (
      <div className="px-4">
        <div className={panel}>
          <p className="text-muted">{ui.invalid}</p>
          <Link href={`/${locale}/${def.slug}`} className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-white">
            {resultUi.takeTest}
          </Link>
        </div>
      </div>
    );
  }

  if (pair === "start") {
    const start = () => {
      try {
        localStorage.setItem(coupleKey(def.slug), window.location.search.slice(1));
      } catch {}
      track("Couple Start", { test: def.slug });
    };
    return (
      <div className="px-4">
        <div className={panel}>
          <p className="text-4xl">💞</p>
          <h1 className="mt-3 text-2xl font-bold">{inviter ? fmt(ui.invitedTitle, { name: inviter }) : ui.invitedTitleAnon}</h1>
          <p className="mt-3 leading-relaxed text-muted">{fmt(ui.invitedText, { test: testName })}</p>
          <Link href={`/${locale}/${def.slug}/start`} onClick={start} className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong">
            {ui.start}
          </Link>
        </div>
      </div>
    );
  }

  const p = pair!;
  const match = coupleMatch(def, decodeAnswers(def, p.mine)!, decodeAnswers(def, p.theirs)!);
  const other = p.otherName || ui.partner;
  const testUrl = `${typeof window === "undefined" ? "" : window.location.origin}/${locale}/${def.slug}`;

  async function share(text: string, url: string, key: string) {
    try {
      if (navigator.share) return await navigator.share({ text, url });
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(key);
    } catch {}
  }

  function sendBack() {
    const q = new URLSearchParams(window.location.search);
    const params = new URLSearchParams({ a: q.get("a") ?? "", b: p.mine });
    if (inviter) params.set("n", inviter);
    if (cleanName(myName)) params.set("m", cleanName(myName));
    track("Couple Send Back", { test: def.slug });
    share(fmt(ui.shareText, { score: match.score, test: testName }), `${window.location.origin}/${locale}/${def.slug}/couple?${params}`, "back");
  }

  async function buy(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(resultUi.invalidEmail);
    if (!consent) return setError(resultUi.consentRequired);
    setBusy(true);
    track("Checkout Start", { test: def.slug, plan: "couple" });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: def.slug, locale, email, answers: p.mine, gender: p.gender, plan: "couple", partnerAnswers: p.theirs, partnerName: p.otherName }),
      });
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setError(resultUi.error);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <div className="rounded-3xl bg-accent p-8 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-wider opacity-85">{ui.matchTitle}</p>
        <p className="mt-2 font-display text-6xl font-extrabold">{match.score}%</p>
        <p className="mt-2 text-xl font-bold">{ui.bands[match.band]}</p>
        <p className="mt-1 opacity-85">{fmt(ui.matchWith, { name: other })} · {testName}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => share(fmt(ui.shareText, { score: match.score, test: testName }), testUrl, "score")}
            className="rounded-lg bg-white px-5 py-3 font-semibold text-accent"
          >
            {copied === "score" ? ui.copied : ui.shareScore}
          </button>
        </div>
      </div>

      {p.invited && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-bold">{fmt(ui.sendBackTitle, { name: other })}</h2>
          <p className="mt-2 text-sm text-muted">{ui.sendBackText}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              maxLength={30}
              aria-label={ui.nameLabel}
              placeholder={ui.nameLabel}
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 focus:border-accent focus:outline-none"
            />
            <button onClick={sendBack} className="rounded-lg border-2 border-accent px-5 py-3 font-semibold text-accent">
              {copied === "back" ? ui.copied : ui.copy}
            </button>
          </div>
        </section>
      )}

      <div className="mt-6 grid items-start gap-6 md:grid-cols-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 md:col-span-3">
          <ul className="space-y-4" aria-hidden>
            {match.dims.slice(0, 8).map((d, i) => (
              <li key={d.dim}>
                <div className="flex justify-between text-sm font-medium">
                  <span>{dimensionNames[i]}</span>
                  <span className="select-none blur-sm">{d.mine}% · {d.theirs}%</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-accent blur-[3px]" style={{ width: `${30 + ((i * 37) % 60)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-gradient-to-t from-surface pb-4">
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">🔒 {resultUi.locked}</span>
          </div>
        </div>

        <form onSubmit={buy} className="rounded-2xl border-2 border-accent bg-surface p-6 md:col-span-2">
          <h2 className="text-lg font-bold">{ui.unlockTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{fmt(ui.unlockText, { name: other })}</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed">
            {ui.includes.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-accent">✓</span>
                {line}
              </li>
            ))}
          </ul>
          <label className="mt-5 block text-sm font-medium" htmlFor="email">{resultUi.emailLabel}</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={resultUi.emailPlaceholder}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <label className="mt-4 flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
            <span>
              <Link href={`/${locale}/terms`} className="underline" target="_blank">{resultUi.consent}</Link>
            </span>
          </label>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
          <button
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-accent px-5 py-3.5 font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-strong disabled:opacity-60"
          >
            {busy ? "…" : fmt(ui.buy, { price })}
          </button>
          <p className="mt-3 text-center text-xs text-muted">{ui.note}</p>
          <p className="mt-1 text-center text-xs text-muted">🔒 {resultUi.secure}</p>
        </form>
      </div>
    </div>
  );
}
