import type { Locale } from "@/lib/i18n/locales";
import { fmt, getDefinition, getTestText, getUi } from "@/lib/i18n/messages";
import { site } from "@/lib/site";
import { cleanName, coupleMatch, pairKey } from "@/lib/tests/couple";
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
  let headline: { name: string; text: string; label?: string } | undefined;
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

  return { ui, text, vars, headline, instrument, sections, crisis, intro: fmt(r.intro, vars), subject: fmt(r.subject, vars) };
}

export type Report = Awaited<ReturnType<typeof buildReport>>;

// The couple report compares the buyer with the partner who took the same test.
// It has the same shape as a normal report, so the page, email and PDF are shared.
export async function buildCoupleReport(locale: Locale, slug: string, mine: number[], theirs: number[], partnerName: string): Promise<Report> {
  const def = getDefinition(slug)!;
  const [ui, text] = await Promise.all([getUi(locale), getTestText(locale, slug)]);
  const r = ui.report;
  const name = cleanName(partnerName) || ui.couple.partner;
  const vars = { test: text.name, site: site.name, url: `${site.url}/${locale}`, name };
  const match = coupleMatch(def, mine, theirs);
  // The fallback name ("your partner") starts some lines, so those get a capital.
  const nameLabel = name.charAt(0).toUpperCase() + name.slice(1);

  const typeName = (type?: string) =>
    !type ? "" : def.outcome === "top" ? text.dimensions[type]?.name ?? "" : text.types?.[type]?.name ?? "";
  const [myType, theirType] = [typeName(match.mine.type), typeName(match.theirs.type)];
  const pairText = match.mine.type && match.theirs.type ? text.couple?.[pairKey(match.mine.type, match.theirs.type)] : undefined;
  const headline = {
    label: r.matchLabel,
    name: fmt(r.matchName, { score: match.score, band: ui.couple.bands[match.band] }),
    text: [
      r.matchText[match.band],
      myType && theirType ? fmt(r.typesLine, { mine: myType, theirs: theirType, name: nameLabel }) : "",
      pairText ?? "",
    ].filter(Boolean).join(" "),
  };

  const sections = match.dims.map((d) => ({
    name: text.dimensions[d.dim].name,
    short: fmt(r.scoreLine, { mine: d.mine, theirs: d.theirs, name: nameLabel }),
    percent: 100 - Math.abs(d.mine - d.theirs),
    level: r.closeness[d.closeness],
    body: r.closenessText[d.closeness],
  }));

  const crisis = match.mine.crisis ? `${ui.result.crisisTitle}. ${ui.result.crisisText}` : "";
  return {
    ui,
    text: { ...text, name: fmt(ui.couple.product, { test: text.name }), summary: fmt(r.coupleSummary, vars) },
    vars,
    headline,
    instrument: undefined,
    sections,
    crisis,
    intro: fmt(r.coupleIntro, vars),
    subject: fmt(r.coupleSubject, vars),
  };
}

// Builds the paid report email (HTML + plain text) for one completed test.
export async function renderReport(locale: Locale, slug: string, answers: number[], extra?: string) {
  return renderReportEmail(locale, await buildReport(locale, slug, answers), extra);
}

export async function renderCoupleReport(locale: Locale, slug: string, mine: number[], theirs: number[], partnerName: string) {
  return renderReportEmail(locale, await buildCoupleReport(locale, slug, mine, theirs, partnerName));
}

// extra is an optional line shown after the intro, e.g. the link to a pack.
async function renderReportEmail(locale: Locale, report: Report, extra?: string) {
  const { ui, text, vars, headline, instrument, sections, crisis, intro, subject } = report;
  const r = ui.report;

  const html = `<!doctype html><html lang="${locale}" style="color-scheme:light only"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><style>:root{color-scheme:light only;supported-color-schemes:light only}</style></head><body style="margin:0;background:#f4f3fa;font-family:Arial,Helvetica,sans-serif;color:#17152b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#5b3df5;color:#ffffff;padding:28px 32px">
<div style="font-size:14px;opacity:.85">${esc(site.name)}</div>
<div style="font-size:26px;font-weight:bold;margin-top:6px">${esc(text.name)}</div>
</td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6">
<p>${esc(r.greeting)}</p>
<p>${esc(intro)}</p>
${extra ? `<p style="background:#eeeaff;border-radius:12px;padding:14px 16px">${esc(extra)}</p>` : ""}
${crisis ? `<p style="background:#fff1f2;border:2px solid #fb7185;border-radius:12px;padding:14px 16px">${esc(crisis)} <a href="https://findahelpline.com">findahelpline.com</a></p>` : ""}
<p style="color:#625f7a">${esc(text.summary)}</p>
${headline ? `<div style="background:#eeeaff;border-radius:12px;padding:18px 20px;margin:20px 0"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#5b3df5;font-weight:bold">${esc(headline.label ?? r.typeLabel)}</div><div style="font-size:22px;font-weight:bold;margin:4px 0 8px">${esc(headline.name)}</div><div>${esc(headline.text)}</div></div>` : ""}
${instrument ? `<div style="border:1px solid #e6e3f0;border-radius:12px;padding:18px 20px;margin:20px 0"><div style="font-size:18px;font-weight:bold">${esc(instrument.label)} · ${esc(instrument.band)}</div><div style="color:#625f7a;font-size:13px;margin-top:6px">${esc(instrument.description)}</div></div>` : ""}
${sections
  .map(
    (s) => `<div style="margin:28px 0 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:17px;font-weight:bold;padding-right:12px">${esc(s.name)}</td><td align="right" valign="top" style="font-weight:bold;color:#5b3df5;white-space:nowrap">${s.percent}% · ${esc(s.level)}</td></tr></table>
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
    intro,
    extra ?? "",
    crisis,
    text.summary,
    headline ? `${headline.label ?? r.typeLabel}: ${headline.name}\n${headline.text}` : "",
    instrument ? `${instrument.label} – ${instrument.band}\n${instrument.description}` : "",
    ...sections.map((s) => `${s.name}: ${s.percent}% (${s.level})\n${s.short}\n${s.body}`),
    fmt(r.outro, vars),
    fmt(r.signature, vars),
    fmt(ui.footer.disclaimer, vars),
  ]
    .filter(Boolean)
    .join("\n\n");

  const pdf = await renderReportPdf(report, text.name);
  const filename = `${text.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}.pdf`;

  return { subject, html, text: plain, attachments: [{ filename, content: pdf }] };
}
