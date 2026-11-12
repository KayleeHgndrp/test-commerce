"use client";

import { useCallback, useEffect, useState } from "react";

// Beheer van partners voor de eigenaar (alleen Nederlands). Vraagt om ADMIN_TOKEN,
// die alleen in deze browsertab wordt bewaard.
type Row = {
  id: string;
  ref: string;
  name: string;
  email: string;
  site: string;
  created: number;
  verified: boolean;
  status: "active" | "blocked";
  link: string;
  clicksMonth: number;
  clicksTotal: number;
  payouts: { period: string; cents: number; date: string }[];
  payoutDetailsSent: string;
  summary: { sales: number; earnedCents: number; currentQuarterCents: number; paidCents: number; payableCents: number; due: boolean; currentQuarter: string };
};

const euro = (cents: number) => new Intl.NumberFormat("nl", { style: "currency", currency: "eur" }).format(cents / 100);
const day = (unix: number) => new Date(unix * 1000).toLocaleDateString("nl");

function previousQuarter(current: string) {
  const [y, q] = current.split("-Q").map(Number);
  return q === 1 ? `${y - 1}-Q4` : `${y}-Q${q - 1}`;
}

export function PartnerAdmin() {
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [unclaimed, setUnclaimed] = useState<{ ref: string; date: number; cents: number }[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async (value: string) => {
    setError("");
    const res = await fetch("/api/admin/partners", { headers: { authorization: `Bearer ${value}` }, cache: "no-store" }).catch(() => null);
    if (!res?.ok) {
      setRows(null);
      setError(res?.status === 401 ? "Onjuiste beheersleutel." : "Laden mislukt, probeer het opnieuw.");
      return;
    }
    try {
      sessionStorage.setItem("admin-token", value);
    } catch {}
    const body = await res.json();
    setRows(body.partners);
    setUnclaimed(body.unclaimed);
  }, []);

  useEffect(() => {
    let saved = "";
    try {
      saved = sessionStorage.getItem("admin-token") ?? "";
    } catch {}
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(saved);
      load(saved);
    }
  }, [load]);

  async function act(row: Row, body: Record<string, unknown>, question: string) {
    if (!window.confirm(question)) return;
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ id: row.id, ...body }),
    }).catch(() => null);
    if (!res?.ok) setError("Opslaan mislukt.");
    await load(token);
  }

  if (!rows) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(token);
        }}
        className="mx-auto max-w-md space-y-3 rounded-3xl border border-border bg-surface p-6"
      >
        <h1 className="text-2xl font-extrabold">Partnerbeheer</h1>
        <label htmlFor="token" className="block text-sm text-muted">Beheersleutel</label>
        <input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="rounded-lg bg-accent px-6 py-3 font-semibold text-white">Openen</button>
      </form>
    );
  }

  const totalPayable = rows.reduce((sum, r) => sum + (r.summary.due && r.status === "active" ? r.summary.payableCents : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Partnerbeheer</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} partners · nu uit te betalen: <strong>{euro(totalPayable)}</strong> (vanaf {euro(2500)} per partner, alleen afgesloten kwartalen)
          </p>
        </div>
        <button onClick={() => load(token)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Vernieuwen</button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              {["Partner", "Klikken (maand/totaal)", "Verkopen", "Verdiend", "Dit kwartaal", "Uitbetaald", "Uit te betalen", "Bankgegevens", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-border align-top ${r.status === "blocked" ? "opacity-50" : ""}`}>
                <td className="px-3 py-3">
                  <div className="font-semibold">{r.ref}{!r.verified && <span className="ml-2 text-xs text-amber-600">niet bevestigd</span>}</div>
                  <div>{r.name}</div>
                  <div className="text-muted">{r.email}</div>
                  <a href={/^https?:\/\//.test(r.site) ? r.site : `https://${r.site}`} target="_blank" rel="noreferrer noopener" className="break-all text-xs underline">{r.site}</a>
                  <div className="text-xs text-muted">sinds {day(r.created)}</div>
                </td>
                <td className="px-3 py-3">{r.clicksMonth} / {r.clicksTotal}</td>
                <td className="px-3 py-3">{r.summary.sales}</td>
                <td className="px-3 py-3">{euro(r.summary.earnedCents)}</td>
                <td className="px-3 py-3">{euro(r.summary.currentQuarterCents)}</td>
                <td className="px-3 py-3">
                  {euro(r.summary.paidCents)}
                  {r.payouts.map((p) => (
                    <div key={`${p.period}-${p.date}`} className="text-xs text-muted">{p.period}: {euro(p.cents)} op {p.date}</div>
                  ))}
                </td>
                <td className="px-3 py-3 font-semibold">{euro(r.summary.payableCents)}</td>
                <td className="px-3 py-3 text-xs">{r.payoutDetailsSent ? `per mail op ${r.payoutDetailsSent}` : "nog niet"}</td>
                <td className="space-y-2 px-3 py-3">
                  {r.summary.due && r.status === "active" && (
                    <button
                      onClick={() =>
                        act(
                          r,
                          { action: "paid", period: previousQuarter(r.summary.currentQuarter), cents: r.summary.payableCents },
                          `Heb je ${euro(r.summary.payableCents)} overgemaakt aan ${r.name}? Dit wordt vastgelegd als uitbetaling.`,
                        )
                      }
                      className="block w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white"
                    >
                      Markeer {euro(r.summary.payableCents)} als betaald
                    </button>
                  )}
                  <button
                    onClick={() =>
                      act(
                        r,
                        { action: r.status === "active" ? "block" : "unblock" },
                        r.status === "active" ? `Samenwerking met ${r.ref} beëindigen?` : `${r.ref} weer actief maken?`,
                      )
                    }
                    className="block w-full rounded-lg border border-border px-3 py-2 text-xs"
                  >
                    {r.status === "active" ? "Beëindigen" : "Heractiveren"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unclaimed.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <h2 className="font-semibold">Verkopen met een ref zonder aangemelde partner</h2>
          <ul className="mt-2 space-y-1 text-muted">
            {unclaimed.map((u, i) => (
              <li key={i}>{day(u.date)} · ?ref={u.ref} · commissie {euro(u.cents)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
