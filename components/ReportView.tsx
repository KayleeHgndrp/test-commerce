import type { Report } from "@/lib/report/render";

export function ReportView({ report }: { report: Report }) {
  const { ui, text, headline, instrument, sections, crisis } = report;
  return (
    <div className="space-y-6 text-left">
      {crisis && (
        <div role="alert" className="rounded-2xl border-2 border-rose-400 bg-rose-50 p-5 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100">
          <p className="leading-relaxed">{crisis}</p>
          <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold underline">
            {ui.result.crisisLink} →
          </a>
        </div>
      )}
      <p className="leading-relaxed text-muted">{text.summary}</p>
      {headline && (
        <div className="rounded-2xl bg-accent-soft p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">{ui.report.typeLabel}</p>
          <p className="mt-1 font-display text-2xl font-extrabold">{headline.name}</p>
          <p className="mt-2 leading-relaxed">{headline.text}</p>
        </div>
      )}
      {instrument && (
        <div className="rounded-2xl border border-border p-6">
          <p className="text-lg font-bold">{instrument.label} · {instrument.band}</p>
          <p className="mt-2 text-sm text-muted">{instrument.description}</p>
        </div>
      )}
      {sections.map((s) => (
        <section key={s.name} className="rounded-2xl border border-border p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-bold">{s.name}</h2>
            <span className="shrink-0 text-sm font-bold text-accent">{s.percent}% · {s.level}</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(s.percent, 2)}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted">{s.short}</p>
          <p className="mt-3 leading-relaxed">{s.body}</p>
        </section>
      ))}
    </div>
  );
}
