"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { fmt } from "@/lib/i18n/fmt";
import type { UiMessages } from "@/lib/i18n/messages";
import { cleanName } from "@/lib/tests/couple";
import { resultKey } from "./Quiz";

// Lets someone who finished a couple test send their partner a link. The link
// carries their answers, so the partner's browser can work out the match.
export function CoupleInvite({ locale, slug, testName, ui }: { locale: string; slug: string; testName: string; ui: UiMessages["couple"] }) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function invite() {
    let answers = "";
    try {
      answers = (JSON.parse(localStorage.getItem(resultKey(slug)) ?? "null") as { answers?: string } | null)?.answers ?? "";
    } catch {}
    if (!answers) return;
    const params = new URLSearchParams({ a: answers });
    if (cleanName(name)) params.set("n", cleanName(name));
    const url = `${window.location.origin}/${locale}/${slug}/couple?${params}`;
    setLink(url);
    track("Couple Invite", { test: slug });
    const message = fmt(ui.inviteMessage, { test: testName });
    try {
      if (navigator.share) return await navigator.share({ text: message, url });
    } catch {
      // Closing the share sheet throws; the link is still shown to copy.
      return;
    }
    copy(url);
  }

  async function copy(url = link) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {}
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-bold">💞 {ui.inviteTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{ui.inviteText}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          aria-label={ui.nameLabel}
          placeholder={ui.nameLabel}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <button onClick={invite} className="rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-strong">
          {ui.createLink}
        </button>
      </div>
      {link && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-background p-3 text-sm">
          <span className="min-w-0 flex-1 truncate text-muted">{link}</span>
          <button onClick={() => copy()} className="shrink-0 font-semibold text-accent">
            {copied ? ui.copied : ui.copy}
          </button>
        </div>
      )}
    </section>
  );
}
