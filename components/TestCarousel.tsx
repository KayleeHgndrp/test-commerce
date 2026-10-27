"use client";

import { useEffect, useRef, useState } from "react";
import { TestCard, type TestCardData } from "./TestCard";

type Props = {
  locale: string;
  tests: (TestCardData & { category: string })[];
  categories: { id: string; label: string }[];
  allLabel: string;
  cta: string;
  previousLabel: string;
  nextLabel: string;
};

export function TestCarousel({ locale, tests, categories, allLabel, cta, previousLabel, nextLabel }: Props) {
  const [category, setCategory] = useState("all");
  const [progress, setProgress] = useState({ start: 0, size: 1 });
  const track = useRef<HTMLDivElement>(null);
  const visible = category === "all" ? tests : tests.filter((t) => t.category === category);

  function update() {
    const el = track.current;
    if (!el) return;
    const size = el.scrollWidth ? el.clientWidth / el.scrollWidth : 1;
    setProgress({ start: el.scrollWidth ? el.scrollLeft / el.scrollWidth : 0, size: Math.min(1, size) });
  }

  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [category]);

  function scroll(direction: 1 | -1) {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  const atStart = progress.start <= 0.001;
  const atEnd = progress.start + progress.size >= 0.999;
  const arrow =
    "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface transition hover:border-accent disabled:opacity-40 disabled:hover:border-border";

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:justify-center" role="tablist">
        {[{ id: "all", label: allLabel }, ...categories].map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              category === c.id
                ? "border-accent bg-accent text-white"
                : "border-border bg-surface text-muted hover:border-accent hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-surface p-4 shadow-xl shadow-black/[0.03] sm:p-6">
        <div
          ref={track}
          onScroll={update}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((test) => (
            <div key={test.slug} className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
              <TestCard locale={locale} test={test} cta={cta} />
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button className={arrow} onClick={() => scroll(-1)} disabled={atStart} aria-label={previousLabel}>
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M13 8H3m4-4L3 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="absolute inset-y-0 rounded-full bg-accent transition-[left,width] duration-200"
              style={{ left: `${progress.start * 100}%`, width: `${progress.size * 100}%` }}
            />
          </div>
          <button className={arrow} onClick={() => scroll(1)} disabled={atEnd} aria-label={nextLabel}>
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
