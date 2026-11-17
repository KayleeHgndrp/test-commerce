import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
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
});
