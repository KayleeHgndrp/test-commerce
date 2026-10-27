import Script from "next/script";

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.revenue.js";
  return (
    <>
      <Script defer data-domain={domain} src={src} strategy="afterInteractive" />
      <Script id="plausible-queue" strategy="afterInteractive">
        {"window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}"}
      </Script>
    </>
  );
}
