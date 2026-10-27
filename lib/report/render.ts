import type { Locale } from "@/lib/i18n/locales";
import { fmt, getDefinition, getTestText, getUi } from "@/lib/i18n/messages";
import { site } from "@/lib/site";
import { scoreTest } from "@/lib/tests/scoring";
import { renderReportPdf } from "./pdf";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Collects everything the paid report shows, for both the email and the web page.
export async function buildReport(locale: Locale, slug: string, answers: number[]) {
  const def = getDefinition(slug)!;
  const [ui, text] = await Promise.all([getUi(locale), getTestText(locale, slug)]);
  const result = scoreTest(def, answers);
  const r = ui.report;
  const vars = { test: text.name, site: site.name, url: `${site.url}/${locale}` };

  // Main type headline, if the test has one.
  let headline: { name: string; text: string } | undefined;
  if (result.type && def.outcome === "top") {
    const d = text.dimensions[result.type];
    headline = { name: d.name, text: d.short };
  } else if (result.type && text.types?.[result.type]) {
    const t = text.types[result.type];
    headline = { name: def.outcome === "axes" ? `${result.type} – ${t.name}` : t.name, text: t.text };
  }

  const instrument =
    result.instrument && text.instrument
      ? {
          label: fmt(r.instrumentLabel, {
            name: text.instrument.name,
            score: result.instrument.score,
            max: result.instrument.max,
          }),
          band: text.instrument.bands[result.instrument.band],
          description: text.instrument.description,
        }
      : undefined;

  const sections = result.scores.map((s) => {
    const d = text.dimensions[s.dim];
    return { name: d.name, short: d.short, percent: s.percent, level: ui.levels[s.level], body: d[s.level] };
  });

  const crisis = result.crisis ? `${ui.result.crisisTitle}. ${ui.result.crisisText}` : "";

  return { ui, text, vars, headline, instrument, sections, crisis };
}

export type Report = Awaited<ReturnType<typeof buildReport>>;

// Builds the paid report email (HTML + plain text) for one completed test.
export async function renderReport(locale: Locale, slug: string, answers: number[]) {
  const { ui, text, vars, headline, instrument, sections, crisis } = await buildReport(locale, slug, answers);
  const r = ui.report;

  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f4f3fa;font-family:Arial,Helvetica,sans-serif;color:#17152b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#5b3df5;color:#ffffff;padding:28px 32px">
<div style="font-size:14px;opacity:.85">${esc(site.name)}</div>
<div style="font-size:26px;font-weight:bold;margin-top:6px">${esc(text.name)}</div>
</td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6">
<p>${esc(r.greeting)}</p>
<p>${esc(fmt(r.intro, vars))}</p>
${crisis ? `<p style="background:#fff1f2;border:2px solid #fb7185;border-radius:12px;padding:14px 16px">${esc(crisis)} <a href="https://findahelpline.com">findahelpline.com</a></p>` : ""}
<p style="color:#625f7a">${esc(text.summary)}</p>
${headline ? `<div style="background:#eeeaff;border-radius:12px;padding:18px 20px;margin:20px 0"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#5b3df5;font-weight:bold">${esc(r.typeLabel)}</div><div style="font-size:22px;font-weight:bold;margin:4px 0 8px">${esc(headline.name)}</div><div>${esc(headline.text)}</div></div>` : ""}
${instrument ? `<div style="border:1px solid #e6e3f0;border-radius:12px;padding:18px 20px;margin:20px 0"><div style="font-size:18px;font-weight:bold">${esc(instrument.label)} · ${esc(instrument.band)}</div><div style="color:#625f7a;font-size:13px;margin-top:6px">${esc(instrument.description)}</div></div>` : ""}
${sections
  .map(
    (s) => `<div style="margin:28px 0 0">
<table role="presentation" width="100%"><tr><td style="font-size:17px;font-weight:bold">${esc(s.name)}</td><td align="right" style="font-weight:bold;color:#5b3df5">${s.percent}% · ${esc(s.level)}</td></tr></table>
<div style="background:#e6e3f0;border-radius:99px;height:10px;margin:8px 0 10px"><div style="background:#5b3df5;border-radius:99px;height:10px;width:${Math.max(s.percent, 2)}%"></div></div>
<div style="color:#625f7a;font-size:13px;margin-bottom:6px">${esc(s.short)}</div>
<div>${esc(s.body)}</div></div>`,
  )
  .join("")}
<p style="margin-top:32px">${esc(fmt(r.outro, vars))}</p>
<p>${esc(fmt(r.signature, vars))}</p>
</td></tr>
<tr><td style="padding:20px 32px;background:#f8f7fc;color:#625f7a;font-size:12px;line-height:1.5">${esc(fmt(ui.footer.disclaimer, vars))}</td></tr>
</table></td></tr></table></body></html>`;

  const plain = [
    r.greeting,
    fmt(r.intro, vars),
    crisis,
    text.summary,
    headline ? `${r.typeLabel}: ${headline.name}\n${headline.text}` : "",
    instrument ? `${instrument.label} – ${instrument.band}\n${instrument.description}` : "",
    ...sections.map((s) => `${s.name}: ${s.percent}% (${s.level})\n${s.short}\n${s.body}`),
    fmt(r.outro, vars),
    fmt(r.signature, vars),
    fmt(ui.footer.disclaimer, vars),
  ]
    .filter(Boolean)
    .join("\n\n");

  const pdf = await renderReportPdf({ ui, text, vars, headline, instrument, sections, crisis }, text.name);
  const filename = `${text.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}.pdf`;

  return { subject: fmt(r.subject, vars), html, text: plain, attachments: [{ filename, content: pdf }] };
}
