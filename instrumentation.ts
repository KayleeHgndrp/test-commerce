import type { Instrumentation } from "next";

export function register() {}

// Forwards server errors to a chat webhook (Slack, Discord, Teams, …) when
// ERROR_WEBHOOK_URL is set, so payment or email failures don't go unnoticed.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  const message = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : "";
  const text = `🚨 ${request.method} ${request.path} (${context.routePath}, ${context.routeType})\n${message}${digest ? `\ndigest: ${digest}` : ""}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // "text" is read by Slack/Teams, "content" by Discord.
      body: JSON.stringify({ text, content: text.slice(0, 1900) }),
    });
  } catch {
    // Never let error reporting cause another error.
  }
};
