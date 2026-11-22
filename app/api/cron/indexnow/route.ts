import { cronAuthorized } from "@/lib/cronAuth";
import { indexNowPayload, urlsToSubmit } from "@/lib/indexnow";
import { site } from "@/lib/site";

// Daily job (vercel.json) that pings IndexNow with new and changed pages, see lib/indexnow.ts.
// "?all=1" submits every page in the sitemap.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!site.url.startsWith("https://")) return Response.json({ error: "NEXT_PUBLIC_SITE_URL is not a public https address" }, { status: 500 });

  const all = new URL(request.url).searchParams.get("all") === "1";
  const urls = urlsToSubmit(new Date(), all);
  if (!urls.length) return Response.json({ submitted: 0 });

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(indexNowPayload(urls)),
  });
  if (!response.ok) console.error(`[indexnow] ${response.status} ${await response.text()}`);
  return Response.json({ submitted: urls.length, status: response.status }, { status: response.ok ? 200 : 502 });
}
