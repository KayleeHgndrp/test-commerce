// Fails (exit 1) when an em dash (—) or en dash (–) appears in text visitors can see: message files,
// content (tests, blog posts) and string literals in app code. Readers take these dashes as a sign of
// AI-written text, so rewrite the sentence with a comma, period, colon or parentheses instead.
// Allowed: number ranges such as 1–2 or 31–33. Code comments are skipped; add `dash-ok` to a line
// that needs the character for technical reasons (a regex, for example).
// Runs before every build, so a dash that slips into a PR turns the Vercel build red.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const DASH = /[—–]/g;
const isRange = (text, i) => /\d/.test(text[i - 1] ?? "") && /\d/.test(text[i + 1] ?? "");
const problems = [];

function walk(dir, exts, skip = []) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (skip.some((s) => rel.startsWith(s))) return [];
    if (entry.isDirectory()) return walk(rel, exts, skip);
    return exts.includes(path.extname(entry.name)) ? [rel] : [];
  });
}

function scan(file, { code = false } = {}) {
  const lines = fs.readFileSync(path.join(root, file), "utf8").split("\n");
  let inBlockComment = false;
  lines.forEach((line, n) => {
    if (code) {
      const trimmed = line.trim();
      if (inBlockComment || trimmed.startsWith("/*")) inBlockComment = !trimmed.includes("*/");
      if (inBlockComment || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("//")) return;
      if (line.includes("dash-ok")) return;
      line = line.replace(/\s\/\/.*$/, "");
    }
    for (const m of line.matchAll(DASH)) {
      if (isRange(line, m.index)) continue;
      const start = Math.max(0, m.index - 40);
      problems.push(`${file}:${n + 1}: "${line.slice(start, m.index + 40).trim()}"`);
    }
  });
}

walk("messages", [".json"]).forEach((f) => scan(f));
walk("content", [".json", ".md"], ["content/blog/README.md"]).forEach((f) => scan(f));
walk("app", [".ts", ".tsx"]).forEach((f) => scan(f, { code: true }));
walk("components", [".ts", ".tsx"]).forEach((f) => scan(f, { code: true }));
walk("lib", [".ts", ".tsx"], ["lib/generated"]).forEach((f) => scan(f, { code: true }));

if (problems.length) {
  console.error(`Found ${problems.length} dash(es) (— or –) in visible text. Rewrite these sentences without them:\n`);
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("check:dashes ok, no — or – in visible text.");
