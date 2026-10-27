"use client";

import { useState } from "react";
import type { UiMessages } from "@/lib/i18n/messages";

export function ContactForm({ locale, ui }: { locale: string; ui: UiMessages["contact"] }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, locale }),
    }).catch(() => null);
    setStatus(res?.ok ? "sent" : "error");
  }

  if (status === "sent") {
    return <p className="rounded-2xl bg-accent-soft p-6 text-center font-semibold">{ui.success}</p>;
  }

  const input =
    "mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="name" className="text-sm font-medium">{ui.name}</label>
        <input id="name" name="name" required maxLength={100} className={input} />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium">{ui.email}</label>
        <input id="email" name="email" type="email" required maxLength={254} className={input} />
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium">{ui.message}</label>
        <textarea id="message" name="message" required rows={6} maxLength={5000} className={input} />
      </div>
      <div className="hidden" aria-hidden>
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {status === "error" && <p className="text-sm font-medium text-rose-600">{ui.error}</p>}
      <button
        disabled={status === "sending"}
        className="w-full rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
      >
        {status === "sending" ? ui.sending : ui.send}
      </button>
    </form>
  );
}
