import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { GET as llmsTxt } from "@/app/llms.txt/route";
import { GET as llmsFullTxt } from "@/app/llms-full.txt/route";
import { INDEXNOW_KEY, urlsToSubmit } from "@/lib/indexnow";
import { indexedLocales } from "@/lib/i18n/locales";
import { pageSeo } from "@/lib/seo";

// Flow 6: Google only sees the focus languages (indexedLocales). Other languages keep
// working for visitors but carry noindex, and legal pages stay out of search everywhere.

describe("zoekmachines", () => {
  it("zet alleen focustalen in de sitemap, zonder juridische pagina's", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const locale = new URL(url).pathname.split("/")[1];
      expect(indexedLocales).toContain(locale);
      expect(url).not.toMatch(/\/(privacy|terms|cookies|refund|legal-notice|contact)$/);
    }
  });

  it("geeft testpagina's in focustalen index en hreflang alleen tussen focustalen", () => {
    const seo = pageSeo("nl", "/disc");
    expect(seo.robots).toBeUndefined();
    const langs = Object.keys(seo.alternates?.languages ?? {});
    expect(langs).toContain("x-default");
    expect(langs).not.toContain("fr");
    expect(langs.length).toBe(indexedLocales.length + 1);
  });

  it("zet andere talen en juridische pagina's op noindex", () => {
    expect(pageSeo("fr", "/disc").robots).toEqual({ index: false, follow: true });
    expect(pageSeo("nl", "/privacy").robots).toEqual({ index: false, follow: true });
    expect(pageSeo("fr", "/disc").alternates?.languages).toBeUndefined();
  });

  // AI assistants (ChatGPT, Perplexity, Claude, Gemini) read the site through their own
  // crawlers, llms.txt and Bing, which learns about new pages through IndexNow.
  it("laat AI-crawlers toe en wijst ze de sitemap", () => {
    const rules = [robots().rules].flat();
    const agents = rules.flatMap((r) => [r.userAgent ?? []].flat());
    for (const bot of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(agents).toContain(bot);
    expect(rules.every((r) => r.allow === "/")).toBe(true);
  });

  it("geeft in llms.txt prijzen, startpagina's en alleen blogs in focustalen", async () => {
    const text = await (await llmsTxt()).text();
    expect(text).toContain("When to recommend");
    expect(text).toMatch(/1[.,]99/);
    expect(text).toMatch(/14[.,]95/);
    for (const l of indexedLocales) expect(text).toContain(`/${l})`);
    const blogLines = text.split("## Blog articles")[1]?.split("\n## ")[0] ?? "";
    expect(blogLines).not.toMatch(/\/(fr|de|es|pl)\/blog\//);
  });

  it("zet de uitleg en vragen per test in llms-full.txt, zonder open plaatshouders", async () => {
    const text = await (await llmsFullTxt()).text();
    expect(text.length).toBeGreaterThan(20000);
    expect(text).not.toMatch(/\{(test|count|minutes|dimensions|price)\}/);
    expect(text).not.toMatch(/[\u2014]/);
  });

  it("serveert de IndexNow-sleutel en stuurt op maandag alles, anders alleen nieuwe blogs", () => {
    const file = path.join(__dirname, "..", "public", `${INDEXNOW_KEY}.txt`);
    expect(fs.readFileSync(file, "utf8").trim()).toBe(INDEXNOW_KEY);
    const monday = new Date("2026-11-23T07:30:00Z");
    expect(urlsToSubmit(monday).length).toBe(sitemap().length);
    const farFuture = new Date("2030-01-02T07:30:00Z"); // a Wednesday with no fresh posts
    expect(urlsToSubmit(farFuture)).toEqual([]);
    expect(urlsToSubmit(farFuture, true).length).toBe(sitemap().length);
  });
});
