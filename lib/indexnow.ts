import sitemap from "@/app/sitemap";
import { site } from "@/lib/site";

// IndexNow tells Bing (and through it ChatGPT search, Copilot and DuckDuckGo), Yandex,
// Naver, Seznam and others about new or changed pages. The key is public by design: the
// same value is served as a text file at the site root so the search engines can verify it.
export const INDEXNOW_KEY = "f2dba7602f9f956d1dd79546a1066eb3";

const DAY = 24 * 60 * 60 * 1000;

// Which sitemap URLs to submit. Once a week (Monday) every page goes out, so the search
// engines learn about test page updates too; on other days only blog posts that were
// published or updated in the last two days.
export function urlsToSubmit(now: Date, all = false) {
  const entries = sitemap();
  if (all || now.getUTCDay() === 1) return entries.map((e) => e.url);
  return entries
    .filter((e) => e.lastModified && now.getTime() - new Date(e.lastModified).getTime() <= 2 * DAY)
    .map((e) => e.url);
}

export function indexNowPayload(urls: string[]) {
  return {
    host: new URL(site.url).host,
    key: INDEXNOW_KEY,
    keyLocation: `${site.url}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };
}
