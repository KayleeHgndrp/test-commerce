import Link from "next/link";

export const blogPageHref = (locale: string, page: number) => (page <= 1 ? `/${locale}/blog` : `/${locale}/blog/page/${page}`);

export function BlogPagination({ locale, page, total, labels }: { locale: string; page: number; total: number; labels: { previous: string; next: string; page: string } }) {
  if (total <= 1) return null;
  const nav = "inline-flex h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold transition hover:border-accent";
  return (
    <nav aria-label={labels.page.replace("{page}", String(page))} className="mt-14 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Link href={blogPageHref(locale, page - 1)} rel="prev" className={nav}>← {labels.previous}</Link>}
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <Link
          key={n}
          href={blogPageHref(locale, n)}
          aria-current={n === page ? "page" : undefined}
          className={`grid h-11 min-w-11 place-items-center rounded-lg px-3 text-sm font-semibold transition ${n === page ? "bg-accent text-white" : "text-muted hover:bg-surface hover:text-foreground"}`}
        >
          {n}
        </Link>
      ))}
      {page < total && <Link href={blogPageHref(locale, page + 1)} rel="next" className={nav}>{labels.next} →</Link>}
    </nav>
  );
}
