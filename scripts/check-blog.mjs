// Style and completeness check for blog posts in content/blog/{locale}/{slug}.md.
// Fails (exit 1) on published posts that use dashes as punctuation, contain stock AI phrasing,
// or whose translationKey is missing in one of the site's languages. Drafts only get warnings.
// See docs/seo/writing-guide.md for the rules behind these checks.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = path.resolve(import.meta.dirname, "..");
const blogDir = path.join(root, "content/blog");
const localesSrc = fs.readFileSync(path.join(root, "lib/i18n/locales.ts"), "utf8");
const locales = [...localesSrc.match(/locales = \[([\s\S]*?)\]/)[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]);

// Phrases that make text read as machine-written. Matched case-insensitively.
const bannedPhrases = {
  en: ["delve", "dive into", "in today's world", "in today’s fast-paced", "it's important to note", "it is important to note", "navigate the complexities", "tapestry", "unlock your", "embark on", "a testament to", "in conclusion", "game-changer"],
  nl: ["duik in", "duiken in", "in de wereld van vandaag", "het is belangrijk om te weten", "het is belangrijk op te merken", "ontdek de geheimen", "kortom,", "in een notendop"],
};

const errors = [];
const warnings = [];
const byKey = new Map();

const textOf = (data, content) =>
  [data.title, data.description, data.seoTitle, data.metaDescription, data.ogTitle, data.ogDescription, data.imageAlt,
    ...(Array.isArray(data.faq) ? data.faq.flatMap((f) => [f?.q, f?.a]) : []), content]
    .filter(Boolean)
    .join("\n");

for (const locale of fs.existsSync(blogDir) ? fs.readdirSync(blogDir) : []) {
  const dir = path.join(blogDir, locale);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const full = path.join(dir, file);
    const rel = path.relative(root, full);
    const { data, content } = matter(fs.readFileSync(full, "utf8"));
    const report = (msg) => (data.draft === true ? warnings : errors).push(`${rel}: ${msg}`);
    // Drop code spans, URLs and table divider rows before looking at punctuation.
    const text = textOf(data, content).replace(/`[^`]*`/g, "").replace(/\]\([^)]*\)/g, "]").replace(/^\|?[\s|:-]+\|?$/gm, "");

    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (/[—–]/.test(line)) report(`dash (— or –) used: "${line.trim().slice(0, 80)}"`);
      if (/\s-\s/.test(line) && !/^\s*[-*]\s/.test(line)) report(`hyphen used as a dash: "${line.trim().slice(0, 80)}"`);
    });
    for (const phrase of bannedPhrases[locale] ?? []) {
      if (text.toLowerCase().includes(phrase)) report(`stock phrase "${phrase}"`);
    }
    if (data.translationKey && data.draft !== true) {
      const list = byKey.get(data.translationKey) ?? [];
      list.push(locale);
      byKey.set(data.translationKey, list);
    }
  }
}

for (const [key, have] of byKey) {
  const missing = locales.filter((l) => !have.includes(l));
  if (missing.length) errors.push(`translationKey "${key}" is missing in: ${missing.join(", ")}`);
  const dupes = have.filter((l, i) => have.indexOf(l) !== i);
  if (dupes.length) errors.push(`translationKey "${key}" is used twice in: ${[...new Set(dupes)].join(", ")}`);
}

for (const w of warnings) console.warn(`[check:blog] warning ${w}`);
for (const e of errors) console.error(`[check:blog] ${e}`);
console.log(`[check:blog] ${errors.length} error(s), ${warnings.length} warning(s), ${byKey.size} published article(s)`);
process.exit(errors.length ? 1 : 0);
