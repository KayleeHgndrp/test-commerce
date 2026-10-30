// Generates lib/generated/blog.json from content/blog/{locale}/{slug}.md.
// Each file has YAML front matter (title, SEO fields, ...) and a Markdown body
// that is rendered to HTML here, so pages need no runtime parsing or file access.
// See content/blog/README.md for every supported field.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked, Renderer } from "marked";

const root = path.resolve(import.meta.dirname, "..");
const blogDir = path.join(root, "content/blog");
const localesSrc = fs.readFileSync(path.join(root, "lib/i18n/locales.ts"), "utf8");
const locales = [...localesSrc.match(/locales = \[([\s\S]*?)\]/)[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
const testSlugs = JSON.parse(fs.readFileSync(path.join(root, "content/tests.json"), "utf8"));

const problems = [];
const warn = (file, message) => problems.push(`${path.relative(root, file)}: ${message}`);

const attr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const stripTags = (html) => html.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ");
const slugify = (text) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

function render(markdown) {
  const headings = [];
  const ids = new Map();
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const base = slugify(stripTags(html)) || "section";
        const count = ids.get(base) ?? 0;
        ids.set(base, count + 1);
        const id = count ? `${base}-${count}` : base;
        if (depth === 2 || depth === 3) headings.push({ id, text: stripTags(html).trim(), depth });
        return `<h${depth} id="${id}">${html}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        const attrs = [
          `href="${attr(href)}"`,
          title ? `title="${attr(title)}"` : "",
          external ? 'target="_blank" rel="noopener noreferrer"' : "",
        ].filter(Boolean);
        return `<a ${attrs.join(" ")}>${text}</a>`;
      },
      image({ href, title, text }) {
        const img = `<img src="${attr(href)}" alt="${attr(text)}" loading="lazy" decoding="async">`;
        return title ? `<figure>${img}<figcaption>${title}</figcaption></figure>` : img;
      },
      table(token) {
        return `<div class="table-wrap">${Renderer.prototype.table.call(this, token)}</div>`;
      },
    },
  });
  const html = marked.parse(markdown);
  return { html, headings };
}

const toDate = (value) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
const list = (value) => (Array.isArray(value) ? value.map(String) : value ? [String(value)] : []);

const posts = [];
for (const locale of fs.existsSync(blogDir) ? fs.readdirSync(blogDir) : []) {
  const dir = path.join(blogDir, locale);
  if (!fs.statSync(dir).isDirectory()) continue;
  if (!locales.includes(locale)) {
    warn(dir, `unknown locale "${locale}", skipped`);
    continue;
  }
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const full = path.join(dir, file);
    const slug = file.replace(/\.md$/, "");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug === "page") {
      warn(full, "file name must be a lowercase slug like my-post.md (and not 'page'), skipped");
      continue;
    }
    const { data, content } = matter(fs.readFileSync(full, "utf8"));
    if (!data.title || !data.description || !toDate(data.date)) {
      warn(full, "title, description and a valid date are required, skipped");
      continue;
    }
    const { html, headings } = render(content);
    const words = stripTags(html).split(/\s+/).filter(Boolean).length;
    const relatedTests = list(data.relatedTests).filter((t) => {
      if (testSlugs.includes(t)) return true;
      warn(full, `relatedTests: unknown test "${t}"`);
      return false;
    });
    const seoTitle = data.seoTitle ?? data.title;
    const metaDescription = data.metaDescription ?? data.description;
    if (seoTitle.length > 65) warn(full, `seoTitle is ${seoTitle.length} characters (aim for 60 or fewer)`);
    if (metaDescription.length > 160) warn(full, `meta description is ${metaDescription.length} characters (aim for 155 or fewer)`);
    if (data.image && !data.imageAlt) warn(full, "image has no imageAlt");

    posts.push({
      locale,
      slug,
      title: String(data.title),
      description: String(data.description),
      date: toDate(data.date),
      updated: toDate(data.updated),
      author: data.author ? String(data.author) : undefined,
      authorUrl: data.authorUrl ? String(data.authorUrl) : undefined,
      category: data.category ? String(data.category) : undefined,
      tags: list(data.tags),
      image: data.image ? String(data.image) : undefined,
      imageAlt: data.imageAlt ? String(data.imageAlt) : undefined,
      seoTitle: String(seoTitle),
      metaDescription: String(metaDescription),
      keywords: list(data.keywords),
      canonical: data.canonical ? String(data.canonical) : undefined,
      noindex: data.noindex === true,
      ogTitle: data.ogTitle ? String(data.ogTitle) : undefined,
      ogDescription: data.ogDescription ? String(data.ogDescription) : undefined,
      ogImage: data.ogImage ? String(data.ogImage) : undefined,
      translationKey: data.translationKey ? String(data.translationKey) : undefined,
      related: list(data.related),
      relatedTests,
      faq: Array.isArray(data.faq)
        ? data.faq.filter((item) => item?.q && item?.a).map((item) => ({ q: String(item.q), a: String(item.a) }))
        : [],
      draft: data.draft === true,
      readMinutes: Math.max(1, Math.round(words / 200)),
      headings,
      html,
    });
  }
}

posts.sort((a, b) => b.date.localeCompare(a.date));
fs.mkdirSync(path.join(root, "lib/generated"), { recursive: true });
fs.writeFileSync(path.join(root, "lib/generated/blog.json"), `${JSON.stringify(posts, null, 1)}\n`);
for (const problem of problems) console.warn(`[blog] ${problem}`);
console.log(`[blog] ${posts.length} posts (${posts.filter((p) => p.draft).length} drafts)`);
