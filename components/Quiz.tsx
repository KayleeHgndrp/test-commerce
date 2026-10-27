"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { fmt } from "@/lib/i18n/fmt";
import type { UiMessages } from "@/lib/i18n/messages";
import type { Scale } from "@/lib/tests/types";

type Props = {
  locale: string;
  slug: string;
  name: string;
  items: string[];
  scaleType: Scale;
  scale: string[];
  ui: UiMessages["test"];
};

export type StoredProgress = { gender?: string; answers: (number | null)[]; step: number };

export const progressKey = (slug: string) => `progress:${slug}`;
export const resultKey = (slug: string) => `result:${slug}`;

const PER_STEP = 5;

// Agreement scales diverge (red → grey → green); frequency/intensity scales
// run from "none" to "a lot", so they use one colour that gets stronger.
const DIVERGING = [
  "border-rose-300 bg-rose-100 data-[on=true]:bg-rose-400 data-[on=true]:border-rose-500",
  "border-orange-300 bg-orange-100 data-[on=true]:bg-orange-400 data-[on=true]:border-orange-500",
  "border-slate-300 bg-slate-100 data-[on=true]:bg-slate-400 data-[on=true]:border-slate-500",
  "border-emerald-300 bg-emerald-100 data-[on=true]:bg-emerald-400 data-[on=true]:border-emerald-500",
  "border-teal-300 bg-teal-100 data-[on=true]:bg-teal-500 data-[on=true]:border-teal-600",
];
const SEQUENTIAL = [
  "border-violet-200 bg-violet-50 data-[on=true]:bg-violet-300 data-[on=true]:border-violet-400",
  "border-violet-300 bg-violet-100 data-[on=true]:bg-violet-400 data-[on=true]:border-violet-500",
  "border-violet-400 bg-violet-200 data-[on=true]:bg-violet-500 data-[on=true]:border-violet-600",
  "border-violet-500 bg-violet-300 data-[on=true]:bg-violet-600 data-[on=true]:border-violet-700",
  "border-violet-600 bg-violet-400 data-[on=true]:bg-violet-700 data-[on=true]:border-violet-800",
];

function circleStyles(scaleType: Scale, points: number) {
  if (scaleType === "agree") {
    const sizes = ["h-12 w-12 sm:h-14 sm:w-14", "h-10 w-10 sm:h-12 sm:w-12", "h-9 w-9 sm:h-10 sm:w-10"];
    return DIVERGING.map((color, i) => `${color} ${sizes[Math.min(i, 4 - i)]}`);
  }
  const sizes = ["h-9 w-9 sm:h-10 sm:w-10", "h-10 w-10 sm:h-11 sm:w-11", "h-11 w-11 sm:h-12 sm:w-12", "h-12 w-12 sm:h-13 sm:w-13", "h-12 w-12 sm:h-14 sm:w-14"];
  const pick = points === 4 ? [0, 2, 3, 4] : [0, 1, 2, 3, 4];
  return pick.map((i) => `${SEQUENTIAL[i]} ${sizes[i]}`);
}

function readProgress(slug: string, length: number): StoredProgress | null {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey(slug)) ?? "null") as StoredProgress | null;
    return saved && saved.answers?.length === length && saved.answers.some((a) => a !== null) ? saved : null;
  } catch {
    return null;
  }
}

export function Quiz({ locale, slug, name, items, scaleType, scale, ui }: Props) {
  const router = useRouter();
  const [state, setState] = useState<StoredProgress>(() => ({ answers: Array(items.length).fill(null), step: 0 }));
  const [resumable, setResumable] = useState<StoredProgress | null>(null);
  const [showError, setShowError] = useState(false);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const top = useRef<HTMLDivElement>(null);

  const steps = Math.ceil(items.length / PER_STEP);
  const first = state.step * PER_STEP;
  const indexes = Array.from({ length: Math.min(PER_STEP, items.length - first) }, (_, i) => first + i);
  const answered = state.answers.filter((a) => a !== null).length;
  const stepComplete = indexes.every((i) => state.answers[i] !== null);
  const styles = circleStyles(scaleType, scale.length);

  useEffect(() => {
    // Offer to resume an unfinished attempt saved in this browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResumable(readProgress(slug, items.length));
  }, [slug, items.length]);

  useEffect(() => {
    if (!state.gender) return;
    try {
      localStorage.setItem(progressKey(slug), JSON.stringify(state));
    } catch {}
  }, [slug, state]);

  function answer(index: number, value: number) {
    const answers = [...state.answers];
    answers[index] = value;
    setState({ ...state, answers });
    setShowError(false);
    // Move the next open statement on this page into view.
    const next = indexes.find((i) => i > index && answers[i] === null);
    if (next !== undefined) {
      cards.current[next]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function goTo(step: number) {
    setState((s) => ({ ...s, step }));
    top.current?.scrollIntoView({ behavior: "smooth" });
  }

  function next() {
    if (!stepComplete) {
      setShowError(true);
      const open = indexes.find((i) => state.answers[i] === null)!;
      cards.current[open]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (state.step < steps - 1) return goTo(state.step + 1);
    track("Test Complete", { test: slug });
    try {
      localStorage.setItem(resultKey(slug), JSON.stringify({ answers: state.answers.join(""), gender: state.gender }));
      localStorage.removeItem(progressKey(slug));
    } catch {}
    router.push(`/${locale}/${slug}/result`);
  }

  const panel = "mx-auto mt-10 max-w-xl rounded-3xl border border-border bg-surface p-6 sm:p-10";
  const option =
    "w-full rounded-xl border border-border px-5 py-4 text-left font-medium transition hover:border-accent hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  if (resumable) {
    return (
      <div className="px-4">
        <div className={`${panel} text-center`}>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="mt-4 text-muted">{ui.resume}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button className="rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong" onClick={() => { setState(resumable); setResumable(null); }}>
              {ui.resumeYes}
            </button>
            <button className="rounded-lg border border-border px-6 py-3 font-semibold hover:border-accent" onClick={() => { localStorage.removeItem(progressKey(slug)); setResumable(null); }}>
              {ui.resumeNo}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state.gender) {
    const genders: [string, string][] = [
      ["male", ui.genderMale],
      ["female", ui.genderFemale],
      ["other", ui.genderOther],
    ];
    return (
      <div className="px-4">
        <div className={panel}>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">{name}</p>
          <h1 className="mt-2 text-2xl font-bold">{ui.genderTitle}</h1>
          <p className="mt-2 text-muted">{ui.genderQuestion}</p>
          <div className="mt-6 grid gap-3">
            {genders.map(([value, label]) => (
              <button
                key={value}
                className={option}
                onClick={() => {
                  setState({ ...state, gender: value });
                  track("Test Start", { test: slug });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const percent = Math.round((answered / items.length) * 100);

  return (
    <div ref={top} className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-10">
      <div className="sticky top-16 z-10 -mx-4 bg-background/95 px-4 pb-3 pt-5 backdrop-blur">
        <div className="flex items-center justify-between text-sm font-medium text-muted">
          <span>{percent}%</span>
          <span>{fmt(ui.step, { current: state.step + 1, total: steps })}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="mt-6 text-center">
        <h1 className="mx-auto max-w-md text-xl font-bold leading-snug sm:text-2xl">{ui.instructions[scaleType]}</h1>
        <div className="mt-6 flex items-start justify-center gap-2 sm:gap-6" aria-hidden>
          {scale.map((label, i) => (
            <div key={label} className="flex w-16 flex-col items-center gap-2 sm:w-24">
              <span className="flex h-14 items-center">
                <span className={`block rounded-full border-2 ${styles[i]}`} />
              </span>
              <span className="text-[11px] font-semibold leading-tight sm:text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {indexes.map((index) => {
          const value = state.answers[index];
          return (
            <div
              key={index}
              ref={(el) => { cards.current[index] = el; }}
              className={`rounded-2xl border bg-surface px-4 py-6 text-center transition sm:px-8 ${
                showError && value === null ? "border-rose-400" : "border-border"
              } ${value !== null ? "opacity-70 hover:opacity-100" : ""}`}
            >
              <p id={`q${index}`} className="text-base font-semibold leading-snug sm:text-lg">{items[index]}</p>
              <div role="radiogroup" aria-labelledby={`q${index}`} className="mt-5 flex items-center justify-center gap-2 sm:gap-6">
                {scale.map((label, i) => (
                  <span key={label} className="flex h-14 w-16 items-center justify-center sm:w-24">
                    <button
                      role="radio"
                      aria-checked={value === i + 1}
                      aria-label={label}
                      title={label}
                      data-on={value === i + 1}
                      onClick={() => answer(index, i + 1)}
                      className={`grid place-items-center rounded-full border-2 text-white transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${styles[i]}`}
                    >
                      {value === i + 1 && (
                        <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </span>
                ))}
              </div>
              <div className="mx-auto mt-2 flex max-w-xs justify-between text-[11px] font-medium text-muted sm:hidden" aria-hidden>
                <span>{scale[0]}</span>
                <span>{scale.at(-1)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {showError && <p className="mt-4 text-center text-sm font-medium text-rose-600">{ui.unanswered}</p>}

      <div className="mt-8 flex items-center justify-between gap-4">
        <button
          className="rounded-lg px-4 py-3 text-sm font-semibold text-muted hover:text-foreground disabled:invisible"
          disabled={state.step === 0}
          onClick={() => goTo(state.step - 1)}
        >
          ← {ui.back}
        </button>
        <button
          onClick={next}
          className={`rounded-lg px-8 py-3.5 font-semibold text-white shadow-lg shadow-accent/20 transition ${
            stepComplete ? "bg-accent hover:bg-accent-strong" : "bg-accent/50"
          }`}
        >
          {state.step === steps - 1 ? ui.finish : `${ui.next} →`}
        </button>
      </div>
    </div>
  );
}
