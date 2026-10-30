import { notFound } from "next/navigation";
import { Suspense } from "react";
import { codeLink, deliverPackOnce, paidPack } from "@/lib/coach-pack";
import type { CheckoutSession } from "@/lib/delivery";
import { fmt } from "@/lib/i18n/fmt";
import { hasLocale } from "@/lib/i18n/locales";
import { partnerTexts, type PartnerTexts } from "@/lib/partner-texts";
import { site } from "@/lib/site";
import { stripeRequest } from "@/lib/stripe";

export async function generateMetadata({ params }: PageProps<"/[locale]/partners/codes">) {
  const { locale } = await params;
  return { title: partnerTexts(locale).codesTitle, robots: { index: false } };
}

async function retrievePack(sessionId: string) {
  if (!process.env.STRIPE_SECRET_KEY || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  try {
    return paidPack(await stripeRequest<CheckoutSession>(`checkout/sessions/${sessionId}`));
  } catch {
    return null;
  }
}

// Shows the codes right after payment and emails them if the webhook has not.
async function PackCodes({ t, searchParams }: { t: PartnerTexts; searchParams: PageProps<"/[locale]/partners/codes">["searchParams"] }) {
  const query = await searchParams;
  const pack = typeof query.session_id === "string" ? await retrievePack(query.session_id) : null;
  if (!pack) return <p className="mt-4 leading-relaxed text-muted">{fmt(t.codesMissing, { email: site.contactEmail })}</p>;
  await deliverPackOnce(pack).catch((error) => console.error("[coach-pack] delivery failed", error));
  return (
    <>
      <p className="mt-4 leading-relaxed text-muted">{fmt(t.codesText, { email: pack.email })}</p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 font-mono text-sm break-all">
        {pack.codes.map((code) => (
          <li key={code}>{codeLink(pack.locale, code)}</li>
        ))}
      </ol>
    </>
  );
}

export default async function Codes({ params, searchParams }: PageProps<"/[locale]/partners/codes">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = partnerTexts(locale);
  return (
    <div className="mx-auto mt-12 max-w-3xl px-4">
      <div className="rounded-3xl border border-border bg-surface p-8 sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight">{t.codesTitle}</h1>
        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-background" />}>
          <PackCodes t={t} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
