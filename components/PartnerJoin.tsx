"use client";

import { useEffect, useState } from "react";
import { refPattern } from "@/lib/partners";
import type { PortalTexts } from "@/lib/partner-texts";
import { fmt } from "@/lib/i18n/fmt";

const input =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const button =
  "w-full rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

export function PartnerJoin({ locale, t, host, minutes, termsHref }: { locale: string; t: PortalTexts; host: string; minutes: number; termsHref: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | string>("idle");
  const [email, setEmail] = useState("");
  const [ref, setRef] = useState("");
  const [refTouched, setRefTouched] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpired(new URLSearchParams(window.location.search).has("expired"));
  }, []);

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!refPattern.test(ref)) return setStatus("ref_invalid");
    setStatus("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/partners/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, ref, agree: data.agree === "on", locale }),
    }).catch(() => null);
    if (res?.ok) return setStatus("sent");
    const body = (await res?.json().catch(() => null)) as { error?: string } | null;
    setStatus(body?.error ?? "server_error");
  }

  const error =
    status === "ref_taken" ? t.refTaken : status === "ref_invalid" ? t.refInvalid : status === "invalid_request" ? t.invalid : ["server_error", "rate_limited"].includes(status) ? t.error : null;

  return (
    <div className="space-y-8">
      {expired && <p className="rounded-2xl bg-accent-soft p-4 text-sm font-medium">{t.expired}</p>}
      <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold">{t.joinTitle}</h1>
        {status === "sent" ? (
          <div className="mt-6 rounded-2xl bg-accent-soft p-6">
            <h2 className="text-lg font-bold">{t.joinedTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed">{fmt(t.joinedText, { email, minutes })}</p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-muted">{t.joinIntro}</p>
            <form onSubmit={join} className="mt-6 space-y-5">
              <div>
                <label htmlFor="name" className="text-sm font-medium">{t.name}</label>
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={80}
                  className={input}
                  onChange={(e) => !refTouched && setRef(slugify(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium">{t.email}</label>
                <input id="email" name="email" type="email" required maxLength={254} className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="site" className="text-sm font-medium">{t.site}</label>
                <input id="site" name="site" required maxLength={200} placeholder="https://" className={input} />
              </div>
              <div>
                <label htmlFor="ref" className="text-sm font-medium">{t.ref}</label>
                <input
                  id="ref"
                  required
                  maxLength={32}
                  className={input}
                  value={ref}
                  onChange={(e) => {
                    setRefTouched(true);
                    setRef(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                />
                <p className="mt-1.5 text-xs text-muted">{t.refHint}</p>
                {ref && (
                  <p className="mt-2 break-all text-sm">
                    {t.preview}: <span className="font-semibold">{`${host}/${locale}?ref=${ref}`}</span>
                  </p>
                )}
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="agree" required className="mt-1 accent-[var(--accent)]" />
                <span>
                  <a href={termsHref} className="underline">{t.agree}</a>
                </span>
              </label>
              <div className="hidden" aria-hidden>
                <input name="website" tabIndex={-1} autoComplete="off" />
              </div>
              {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
              <button disabled={status === "sending"} className={button}>
                {status === "sending" ? t.sending : t.submit}
              </button>
            </form>
          </>
        )}
      </section>
      <PartnerLogin t={t} />
    </div>
  );
}

function PartnerLogin({ t }: { t: PortalTexts }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/partners/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => null);
    setStatus(res?.ok ? "sent" : "error");
  }

  return (
    <section id="login" className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-xl font-bold">{t.loginTitle}</h2>
      {status === "sent" ? (
        <p className="mt-3 rounded-2xl bg-accent-soft p-4 text-sm">{t.loginSent}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{t.loginText}</p>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input name="email" type="email" required maxLength={254} aria-label={t.email} placeholder={t.email} className={`${input} mt-0 sm:flex-1`} />
            <button disabled={status === "sending"} className="rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong disabled:opacity-60">
              {status === "sending" ? t.sending : t.loginSubmit}
            </button>
          </form>
          {status === "error" && <p className="mt-3 text-sm font-medium text-rose-600">{t.error}</p>}
        </>
      )}
    </section>
  );
}
