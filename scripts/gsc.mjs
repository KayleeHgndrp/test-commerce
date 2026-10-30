// Reads Google Search Console data for the SEO routines. No dependencies: signs the service-account JWT itself.
// Needs GSC_SERVICE_ACCOUNT_JSON (the key file's JSON, raw or base64) and optionally GSC_SITE
// (default: sc-domain:personalityreveal.com). The service account must be added as a user on the property.
//
//   node scripts/gsc.mjs [days=28] [dimension=query|page|country] [rows=100]
//
// Prints JSON rows with keys, clicks, impressions, ctr and position.
import crypto from "node:crypto";

const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error("GSC_SERVICE_ACCOUNT_JSON is not set");
  process.exit(2);
}
const key = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
const site = process.env.GSC_SITE ?? "sc-domain:personalityreveal.com";
const [days = "28", dimension = "query", rowLimit = "100"] = process.argv.slice(2);

const b64url = (data) => Buffer.from(data).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
  JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }),
)}`;
const jwt = `${unsigned}.${crypto.createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url")}`;

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
});
const token = await tokenRes.json();
if (!token.access_token) {
  console.error("token request failed:", JSON.stringify(token));
  process.exit(1);
}

const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
const res = await fetch(
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
  {
    method: "POST",
    headers: { authorization: `Bearer ${token.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({
      startDate: day(Number(days) + 2),
      endDate: day(2),
      dimensions: [dimension],
      rowLimit: Number(rowLimit),
    }),
  },
);
const data = await res.json();
if (!res.ok) {
  console.error("search analytics request failed:", JSON.stringify(data));
  process.exit(1);
}
console.log(JSON.stringify(data.rows ?? [], null, 1));
