import Link from "next/link";
import type { Locale } from "@/lib/i18n/locales";
import { fmt, type UiMessages } from "@/lib/i18n/messages";
import type { TestDefinition, TestText } from "@/lib/tests/types";

export function TestCard({
  locale,
  ui,
  def,
  text,
}: {
  locale: Locale;
  ui: UiMessages;
  def: TestDefinition;
  text: TestText;
}) {
  return (
    <Link
      href={`/${locale}/${def.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/10"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-2xl" aria-hidden>
          {def.icon}
        </span>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
          {ui.test.free}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-snug group-hover:text-accent">{text.name}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">{text.tagline}</p>
      <p className="mt-4 text-xs font-medium text-muted">
        {fmt(ui.test.questions, { count: def.items.length })} · {fmt(ui.test.minutes, { count: def.minutes })}
      </p>
    </Link>
  );
}
