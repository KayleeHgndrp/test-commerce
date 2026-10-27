// Validates test definitions and all message files.
// Usage: node scripts/check-content.mjs [slug ...]   (no args = everything)
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const order = read("content/tests.json");
const only = process.argv.slice(2);
const slugs = (only.length ? only : order).filter((s) =>
  fs.existsSync(path.join(root, "content/definitions", `${s}.json`)),
);
const locales = fs.readdirSync(path.join(root, "messages")).filter((l) => l !== "en");
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const CATEGORIES = ["personality", "relationships", "work", "screeners", "wellbeing"];
const TYPE_KEYS = {
  attachment: ["secure", "anxious", "avoidant", "fearful"],
  political: ["left_libertarian", "left_authoritarian", "right_libertarian", "right_authoritarian", "centrist"],
  axes: ["E", "I"].flatMap((a) => ["S", "N"].flatMap((b) => ["T", "F"].flatMap((c) => ["J", "P"].map((d) => a + b + c + d)))),
};
const AXES_DIMS = { axes: ["extraversion", "sensing", "thinking", "judging"], attachment: ["anxiety", "avoidance"], political: ["economic", "social"] };

function placeholders(s) {
  return [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
}

function compareShape(where, en, other) {
  if (typeof en === "string") {
    if (typeof other !== "string") return err(where, "expected string");
    if (!other.trim()) err(where, "empty string");
    if (placeholders(en) !== placeholders(other)) err(where, `placeholders differ (${placeholders(en)} vs ${placeholders(other)})`);
    return;
  }
  if (Array.isArray(en)) {
    if (!Array.isArray(other) || other.length !== en.length) return err(where, `expected array of ${en.length}`);
    en.forEach((v, i) => compareShape(`${where}[${i}]`, v, other[i]));
    return;
  }
  if (typeof other !== "object" || other === null) return err(where, "expected object");
  for (const key of Object.keys(en)) {
    if (!(key in other)) err(where, `missing key "${key}"`);
    else compareShape(`${where}.${key}`, en[key], other[key]);
  }
  for (const key of Object.keys(other)) if (!(key in en)) err(where, `unknown key "${key}"`);
}

for (const slug of slugs) {
  const def = read(`content/definitions/${slug}.json`);
  const where = `definitions/${slug}`;
  if (def.slug !== slug) err(where, "slug mismatch");
  if (!CATEGORIES.includes(def.category)) err(where, `bad category ${def.category}`);
  if (def.items.length !== 100) err(where, `has ${def.items.length} items, expected 100`);
  for (const [i, item] of def.items.entries()) {
    if (!def.dimensions.includes(item.dim)) err(where, `item ${i} unknown dim ${item.dim}`);
  }
  for (const dim of def.dimensions) {
    if (!def.items.some((item) => item.dim === dim)) err(where, `dimension ${dim} has no items`);
  }
  if (AXES_DIMS[def.outcome] && AXES_DIMS[def.outcome].join() !== def.dimensions.join()) {
    err(where, `outcome ${def.outcome} requires dimensions ${AXES_DIMS[def.outcome].join(", ")}`);
  }

  const enPath = `messages/en/tests/${slug}.json`;
  if (!fs.existsSync(path.join(root, enPath))) { err(enPath, "missing"); continue; }
  const en = read(enPath);
  for (const key of ["name", "tagline", "intro", "seoTitle", "seoDescription", "summary"]) {
    if (typeof en[key] !== "string" || !en[key]) err(enPath, `missing ${key}`);
  }
  if (en.items?.length !== def.items.length) err(enPath, `has ${en.items?.length} items, definition has ${def.items.length}`);
  const seen = new Set();
  for (const item of en.items ?? []) {
    const norm = String(item).toLowerCase().replace(/[^a-z]/g, "");
    if (seen.has(norm)) err(enPath, `duplicate item "${item}"`);
    seen.add(norm);
  }
  for (const dim of def.dimensions) {
    const d = en.dimensions?.[dim];
    if (!d) { err(enPath, `missing dimension ${dim}`); continue; }
    for (const key of ["name", "short", "low", "mid", "high"]) if (!d[key]) err(enPath, `dimension ${dim} missing ${key}`);
  }
  if (def.instrument) {
    const it = en.instrument;
    if (!it?.name || !it?.description) err(enPath, "missing instrument name/description");
    for (const band of def.instrument.bands) if (!it?.bands?.[band.key]) err(enPath, `missing instrument band ${band.key}`);
  }
  if (def.kind === "likert" && !["agree", "frequency", "phq", "intensity"].includes(def.scale)) err(where, `bad scale ${def.scale}`);
  const typeKeys = TYPE_KEYS[def.outcome];
  if (typeKeys) {
    for (const k of typeKeys) if (!en.types?.[k]?.name || !en.types?.[k]?.text) err(enPath, `missing type ${k}`);
  }

  for (const locale of locales) {
    const p = `messages/${locale}/tests/${slug}.json`;
    if (fs.existsSync(path.join(root, p))) compareShape(p, en, read(p));
  }
}

if (!only.length) {
  const en = read("messages/en/ui.json");
  for (const locale of locales) {
    const p = `messages/${locale}/ui.json`;
    if (fs.existsSync(path.join(root, p))) compareShape(p, en, read(p));
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(`Content OK (${slugs.length} tests, ${locales.length} translated locales).`);
