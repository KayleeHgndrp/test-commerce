"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/i18n/fmt";
import type { UiMessages } from "@/lib/i18n/messages";

type Props = {
  locale: string;
  slug: string;
  name: string;
  items: string[];
  scale: string[];
  ui: UiMessages["test"];
};

export type StoredProgress = { gender?: string; answers: (number | null)[]; index: number };

export const progressKey = (slug: string) => `progress:${slug}`;
export const resultKey = (slug: string) => `result:${slug}`;

function readProgress(slug: string, length: number): StoredProgress | null {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey(slug)) ?? "null") as StoredProgress | null;
    return saved && saved.answers.length === length && saved.answers.some((a) => a !== null) ? saved : null;
  } catch {
    return null;
  }
}

export function Quiz({ locale, slug, name, items, scale, ui }: Props) {
  const router = useRouter();
  const empty = (): StoredProgress => ({ answers: Array(items.length).fill(null), index: 0 });
  const [state, setState] = useState<StoredProgress>(empty);
  const [resumable, setResumable] = useState<StoredProgress | null>(null);

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

  function finish(answers: number[], gender: string) {
    try {
      localStorage.setItem(resultKey(slug), JSON.stringify({ answers: answers.join(""), gender }));
      localStorage.removeItem(progressKey(slug));
    } catch {}
    router.push(`/${locale}/${slug}/result`);
  }

  function answer(value: number) {
    const answers = [...state.answers];
    answers[state.index] = value;
    if (state.index === items.length - 1 && answers.every((a) => a !== null)) {
      setState({ ...state, answers });
      finish(answers as number[], state.gender!);
      return;
    }
    const nextOpen = answers.findIndex((a, i) => a === null && i > state.index);
    const index = nextOpen === -1 ? Math.min(state.index + 1, items.length - 1) : nextOpen;
    setState({ ...state, answers, index });
  }

  const card = "mx-auto mt-10 max-w-2xl rounded-3xl border border-border bg-surface p-6 sm:p-10";
  const option =
    "w-full rounded-2xl border border-border px-5 py-4 text-left font-medium transition hover:border-accent hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  if (resumable) {
    return (
      <div className={`${card} mx-4 text-center sm:mx-auto`}>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="mt-4 text-muted">{ui.resume}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="rounded-full bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong" onClick={() => { setState(resumable); setResumable(null); }}>
            {ui.resumeYes}
          </button>
          <button className="rounded-full border border-border px-6 py-3 font-semibold hover:border-accent" onClick={() => { localStorage.removeItem(progressKey(slug)); setResumable(null); }}>
            {ui.resumeNo}
          </button>
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
      <div className={`${card} mx-4 sm:mx-auto`}>
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">{name}</p>
        <h1 className="mt-2 text-2xl font-bold">{ui.genderTitle}</h1>
        <p className="mt-2 text-muted">{ui.genderQuestion}</p>
        <div className="mt-6 grid gap-3">
          {genders.map(([value, label]) => (
            <button key={value} className={option} onClick={() => setState({ ...state, gender: value })}>
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const answered = state.answers.filter((a) => a !== null).length;
  const current = state.answers[state.index];

  return (
    <div className="px-4">
      <div className="mx-auto mt-8 max-w-2xl">
        <div className="flex items-center justify-between text-sm font-medium text-muted">
          <span>{name}</span>
          <span>{fmt(ui.question, { current: state.index + 1, total: items.length })}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(answered / items.length) * 100}%` }} />
        </div>
      </div>

      <div className={card} key={state.index}>
        <h1 className="min-h-20 text-xl font-semibold leading-snug sm:text-2xl">{items[state.index]}</h1>
        <p className="mt-2 text-sm text-muted">{ui.chooseAnswer}</p>
        <div className="mt-6 grid gap-2.5">
          {scale.map((label, i) => {
            const value = i + 1;
            const selected = current === value;
            return (
              <button
                key={label}
                onClick={() => answer(value)}
                className={`${option} ${selected ? "border-accent bg-accent-soft text-accent" : ""}`}
                aria-pressed={selected}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-between">
          <button
            className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-foreground disabled:opacity-0"
            disabled={state.index === 0}
            onClick={() => setState({ ...state, index: state.index - 1 })}
          >
            ← {ui.back}
          </button>
          {current !== null && state.index < items.length - 1 && (
            <button
              className="rounded-full px-4 py-2 text-sm font-medium text-accent hover:text-accent-strong"
              onClick={() => setState({ ...state, index: state.index + 1 })}
            >
              {ui.next} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
