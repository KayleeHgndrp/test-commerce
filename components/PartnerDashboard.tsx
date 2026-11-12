"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PortalTexts } from "@/lib/partner-texts";
import { fmt } from "@/lib/i18n/fmt";

type Data = {
  blocked?: boolean;
  name: string;
  ref: string;
  locale: string;
  link: string;
  clicksMonth: number;
  clicksTotal: number;
  summary: {
    sales: number;
    earnedCents: number;
    currentQuarter: string;
    currentQuarterCents: number;
    paidCents: number;
    payableCents: number;
    due: boolean;
  };
  sales: { date: number; plan: keyof PortalTexts["plans"]; cents: number }[];
  payouts: { period: string; cents: number; date: string }[];
  payoutDetailsSent: string;
};

const card = "rounded-3xl border border-border bg-surface p-6 sm:p-8";
const input =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function PartnerDashboard({
  locale,
  t,
  tests,
  minimum,
  blockedText,
  currency,
}: {
  locale: string;
  t: PortalTexts;
  tests: { slug: string; name: string }[];
  minimum: string;
  blockedText: string;
  currency: string;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const tag = locale === "no" ? "nb" : locale;
  const money = (cents: number) => new Intl.NumberFormat(tag, { style: "currency", currency }).format(cents / 100);
  const day = (value: number | string) =>
    new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(typeof value === "number" ? new Date(value * 1000) : new Date(value));

  useEffect(() => {
    fetch("/api/partners/me", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace(`/${locale}/partners/join#login`);
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        setData(await res.json());
      })
      .catch(() => setFailed(true));
  }, [locale, router]);

  async function logout() {
    await fetch("/api/partners/logout", { method: "POST" }).catch(() => null);
    router.push(`/${locale}/partners`);
  }

  if (failed) return <p className={card}>{t.loadError}</p>;
  if (!data) return <p className="py-16 text-center text-muted">{t.loading}</p>;
  if (data.blocked) return <p className={card}>{blockedText}</p>;

  const s = data.summary;
  const stats = [
    [t.clicksMonth, data.clicksMonth.toLocaleString(tag)],
    [t.clicksTotal, data.clicksTotal.toLocaleString(tag)],
    [t.sales, s.sales.toLocaleString(tag)],
    [t.earned, money(s.earnedCents)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-accent">{t.dashTitle}</p>
          <h1 className="mt-1 text-3xl font-extrabold">{fmt(t.hello, { name: data.name })}</h1>
        </div>
        <button onClick={logout} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-accent/50">
          {t.logout}
        </button>
      </div>

      <LinkCard t={t} link={data.link} tests={tests} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted">{t.clicksNote}</p>

      <section className={card}>
        <h2 className="text-xl font-bold">{t.payoutTitle}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">{fmt(t.quarterSoFar, { quarter: s.currentQuarter })}</dt>
            <dd className="text-lg font-bold">{money(s.currentQuarterCents)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t.payable}</dt>
            <dd className="text-lg font-bold">{money(s.payableCents)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t.paid}</dt>
            <dd className="text-lg font-bold">{money(s.paidCents)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed">
          {s.due ? fmt(t.payoutDue, { amount: money(s.payableCents) }) : fmt(t.payoutBelow, { minimum })}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t.payoutQuarter}</p>
        {data.payouts.length > 0 && (
          <>
            <h3 className="mt-6 font-semibold">{t.payoutsTitle}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {data.payouts.map((p) => (
                <li key={`${p.period}-${p.date}`} className="flex justify-between gap-4">
                  <span>{p.period} · {day(p.date)}</span>
                  <span className="font-semibold">{money(p.cents)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <BankForm t={t} sent={data.payoutDetailsSent} day={day} />
      </section>

      <section className={card}>
        <h2 className="text-xl font-bold">{t.salesTitle}</h2>
        {data.sales.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t.noSales}</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-medium">{t.date}</th>
                <th className="py-2 font-medium">{t.product}</th>
                <th className="py-2 text-right font-medium">{t.commission}</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.map((sale, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2">{day(sale.date)}</td>
                  <td className="py-2">{t.plans[sale.plan] ?? t.plans.single}</td>
                  <td className="py-2 text-right font-semibold">{money(sale.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function LinkCard({ t, link, tests }: { t: PortalTexts; link: string; tests: { slug: string; name: string }[] }) {
  const [slug, setSlug] = useState("");
  const [copied, setCopied] = useState(false);
  const url = new URL(link);
  if (slug) url.pathname = `${url.pathname.replace(/\/$/, "")}/${slug}`;
  const shown = url.toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <section className={`${card} border-2 border-accent`}>
      <h2 className="text-xl font-bold">{t.linkTitle}</h2>
      <p className="mt-1 text-sm text-muted">{t.linkHint}</p>
      <select
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        aria-label={t.linkTitle}
        className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
      >
        <option value="">{t.wholeSite}</option>
        {tests.map((test) => (
          <option key={test.slug} value={test.slug}>{test.name}</option>
        ))}
      </select>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <code className="flex-1 break-all rounded-xl bg-accent-soft px-4 py-3 text-sm">{shown}</code>
        <button onClick={copy} className="rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-strong">
          {copied ? t.copied : t.copy}
        </button>
      </div>
    </section>
  );
}

function BankForm({ t, sent, day }: { t: PortalTexts; sent: string; day: (v: string) => string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "invalid" | "error">("idle");
  const [date, setDate] = useState(sent);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const res = await fetch("/api/partners/bank", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { date?: string; error?: string } | null;
    if (res?.ok && body?.date) {
      setDate(body.date);
      setStatus("idle");
      form.reset();
    } else setStatus(body?.error === "iban_invalid" ? "invalid" : "error");
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="font-semibold">{t.bankTitle}</h3>
      <p className="mt-1 text-sm text-muted">{t.bankText}</p>
      {date && <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm">{fmt(t.bankSent, { date: day(date) })}</p>}
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="holder" className="text-sm font-medium">{t.holder}</label>
          <input id="holder" name="holder" required maxLength={100} autoComplete="name" className={input} />
        </div>
        <div>
          <label htmlFor="iban" className="text-sm font-medium">{t.iban}</label>
          <input id="iban" name="iban" required maxLength={50} autoComplete="off" className={input} />
        </div>
        {status === "invalid" && <p className="text-sm font-medium text-rose-600 sm:col-span-2">{t.ibanInvalid}</p>}
        {status === "error" && <p className="text-sm font-medium text-rose-600 sm:col-span-2">{t.error}</p>}
        <button disabled={status === "sending"} className="rounded-lg border border-accent px-6 py-3 font-semibold text-accent hover:bg-accent-soft disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
          {status === "sending" ? t.sending : t.bankSubmit}
        </button>
      </form>
    </div>
  );
}
