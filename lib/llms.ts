import { allPosts, postPath } from "@/lib/blog";
import { defaultLocale, localeNames, locales } from "@/lib/i18n/locales";
import { fmt, getAllTestTexts, getUi } from "@/lib/i18n/messages";
import { formatPrice, site } from "@/lib/site";
import type { Category } from "@/lib/tests/types";

const CATEGORY_ORDER: Category[] = ["personality", "relationships", "work", "screeners", "wellbeing"];

// Builds /llms.txt (an index for language models, see llmstxt.org) or, with `full`,
// /llms-full.txt with every test's description and dimensions inlined.
export async function buildLlmsTxt(full: boolean) {
  const locale = defaultLocale;
  const ui = await getUi(locale);
  const tests = await getAllTestTexts(locale);
  const base = `${site.url}/${locale}`;
  const vars = { site: site.name, price: formatPrice(locale), count: tests.length, languages: locales.length };
  const list = (items: string[]) => items.map((item) => `- ${fmt(item, vars)}`).join("\n");
  const titled = (items: { title: string; text: string }[]) =>
    items.map(({ title, text }) => `- **${fmt(title, vars)}**: ${fmt(text, vars)}`).join("\n");

  const out = [
    `# ${site.name}`,
    `> ${fmt(ui.meta.description, vars)}`,
    fmt(ui.about.mission, vars),
    `## Key facts`,
    list([
      `${tests.length} online psychological tests, each with 100 statements and taking about 5 minutes.`,
      `Taking a test and seeing a preview of the result areas is free; no account is needed.`,
      `The full personal report costs ${vars.price} once per test (no subscription) and is emailed within minutes.`,
      `Available in ${locales.length} languages: ${locales.map((l) => localeNames[l]).join(", ")}.`,
      `Every page exists in each language at ${site.url}/{language-code}/… (for example ${site.url}/nl/big-five).`,
      fmt(ui.footer.disclaimer, vars),
    ]),
    `## How the tests are built`,
    titled(ui.about.how),
    `## What users can count on`,
    titled(ui.about.values),
    `## Full report includes`,
    list(ui.home.planReportFeatures),
  ];

  for (const category of CATEGORY_ORDER) {
    const inCategory = tests.filter(({ def }) => def.category === category);
    if (!inCategory.length) continue;
    out.push(`## ${ui.categories[category]}`);
    if (category === "screeners") out.push(ui.test.screenerNote);

    if (!full) {
      out.push(
        inCategory
          .map(({ def, text }) => {
            const measures = def.dimensions.map((d) => text.dimensions[d]?.name ?? d).join(", ");
            return `- [${text.name}](${base}/${def.slug}): ${text.tagline} Measures: ${measures}.`;
          })
          .join("\n"),
      );
      continue;
    }

    for (const { def, text } of inCategory) {
      out.push(
        `### ${text.name}`,
        `URL: ${base}/${def.slug}\n${def.items.length} questions · about ${def.minutes} minutes`,
        text.intro,
        text.summary,
        `${ui.test.measuresTitle}:\n${def.dimensions
          .map((d) => `- **${text.dimensions[d]?.name ?? d}**: ${text.dimensions[d]?.short ?? ""}`)
          .join("\n")}`,
      );
      if (text.instrument) out.push(`${text.instrument.name}: ${text.instrument.description}`);
    }
  }

  const posts = allPosts().filter((post) => !post.noindex);
  if (posts.length) {
    out.push(
      `## Blog articles`,
      posts.map((post) => `- [${post.title}](${site.url}${postPath(post)}) (${localeNames[post.locale as keyof typeof localeNames]}): ${post.description}`).join("\n"),
    );
  }

  out.push(
    `## Frequently asked questions`,
    ui.home.faq.map(({ q, a }) => `**${fmt(q, vars)}**\n${fmt(a, vars)}`).join("\n\n"),
    `## Pages`,
    list([
      `[Home](${base})`,
      `[About](${base}/about)`,
      `[Contact](${base}/contact)`,
      `[Terms](${base}/terms)`,
      `[Privacy](${base}/privacy)`,
      `[Refund policy](${base}/refund)`,
    ]),
  );
  if (!full) out.push(`## Optional`, `- [Full test descriptions](${site.url}/llms-full.txt): every test with its dimensions explained`);

  return new Response(`${out.join("\n\n")}\n`, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
