import Link from "next/link";

export type TestCardData = {
  slug: string;
  name: string;
  tagline: string;
  meta: string;
};

export function TestCard({ locale, test, cta }: { locale: string; test: TestCardData; cta: string }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition hover:border-accent/50 hover:shadow-xl hover:shadow-black/5 sm:p-7">
      <h3 className="text-center text-xl font-bold leading-snug sm:text-2xl">{test.name}</h3>
      <p className="mt-3 flex-1 text-center text-sm leading-relaxed text-muted sm:text-[15px]">{test.tagline}</p>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-dashed border-border pt-5">
        <span className="text-xs font-medium text-muted">{test.meta}</span>
        <Link
          href={`/${locale}/${test.slug}`}
          className="shrink-0 whitespace-nowrap rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
        >
          {cta} →
        </Link>
      </div>
    </div>
  );
}
