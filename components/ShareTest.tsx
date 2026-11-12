"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { fmt } from "@/lib/i18n/fmt";
import type { UiMessages } from "@/lib/i18n/messages";

// "Compare with a friend": shares the test (never the answers) with the free main
// type in the message when there is one. Every share brings in a visitor that
// does not depend on Google.
export function ShareTest({ locale, slug, testName, typeName, ui }: { locale: string; slug: string; testName: string; typeName?: string; ui: UiMessages["share"] }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/${locale}/${slug}?utm_source=share&utm_medium=friend`;
    const text = typeName ? fmt(ui.messageWithType, { type: typeName, test: testName }) : fmt(ui.message, { test: testName });
    track("Share Result", { test: slug });
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center">
      <h2 className="text-lg font-bold">{ui.title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">{ui.text}</p>
      <button onClick={share} className="mt-4 inline-flex rounded-lg border-2 border-accent px-5 py-2.5 font-semibold text-accent transition hover:bg-accent hover:text-white">
        {copied ? ui.copied : ui.button}
      </button>
    </div>
  );
}
