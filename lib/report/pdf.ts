import path from "node:path";
import PDFDocument from "pdfkit";
import { fmt } from "@/lib/i18n/messages";
import { site } from "@/lib/site";
import type { Report } from "./render";

// Noto Sans covers Latin, Greek and Cyrillic, so every locale renders correctly.
const fontDir = path.join(process.cwd(), "assets/fonts");
const ACCENT = "#6246ea";
const MUTED = "#5f5b6e";
const TEXT = "#14121f";
const TRACK = "#ebe8e1";

// Renders the paid report as an A4 PDF (attached to the report email).
export function renderReportPdf(report: Report, testName: string): Promise<Buffer> {
  const { ui, text, vars, headline, instrument, sections, crisis } = report;
  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `${testName} – ${site.name}`, Author: site.name } });
  doc.registerFont("regular", path.join(fontDir, "NotoSans-Regular.ttf"));
  doc.registerFont("bold", path.join(fontDir, "NotoSans-Bold.ttf"));

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const width = doc.page.width - 100;

  // Header band
  doc.rect(0, 0, doc.page.width, 110).fill(ACCENT);
  doc.fillColor("#ffffff").font("regular").fontSize(11).text(site.name, 50, 32);
  doc.font("bold").fontSize(22).text(testName, 50, 52, { width });
  doc.y = 140;

  const paragraph = (value: string, options: { color?: string; size?: number; font?: string; gap?: number } = {}) => {
    doc.fillColor(options.color ?? TEXT).font(options.font ?? "regular").fontSize(options.size ?? 10.5);
    doc.text(value, 50, doc.y, { width, lineGap: 3 });
    doc.moveDown(options.gap ?? 0.8);
  };

  if (crisis) paragraph(crisis, { color: "#be123c", font: "bold" });
  paragraph(text.summary, { color: MUTED });

  if (headline) {
    doc.moveDown(0.3);
    paragraph((headline.label ?? ui.report.typeLabel).toUpperCase(), { color: ACCENT, size: 9, font: "bold", gap: 0.2 });
    paragraph(headline.name, { size: 18, font: "bold", gap: 0.4 });
    paragraph(headline.text);
  }

  if (instrument) {
    paragraph(`${instrument.label} · ${instrument.band}`, { size: 13, font: "bold", gap: 0.3 });
    paragraph(instrument.description, { color: MUTED, size: 9.5 });
  }

  for (const s of sections) {
    // Keep a section's heading and bar together on one page.
    if (doc.y > doc.page.height - 160) doc.addPage();
    doc.moveDown(0.6);
    const top = doc.y;
    doc.fillColor(TEXT).font("bold").fontSize(13).text(s.name, 50, top, { width: width - 120 });
    doc.fillColor(ACCENT).font("bold").fontSize(10).text(`${s.percent}% · ${s.level}`, 50, top + 2, { width, align: "right" });
    doc.y = Math.max(doc.y, top + 20) + 4;
    doc.roundedRect(50, doc.y, width, 7, 3.5).fill(TRACK);
    doc.roundedRect(50, doc.y, Math.max(7, (width * s.percent) / 100), 7, 3.5).fill(ACCENT);
    doc.y += 16;
    paragraph(s.short, { color: MUTED, size: 9.5, gap: 0.4 });
    paragraph(s.body);
  }

  doc.moveDown(1);
  paragraph(fmt(ui.footer.disclaimer, vars), { color: MUTED, size: 8.5 });
  doc.end();
  return done;
}
