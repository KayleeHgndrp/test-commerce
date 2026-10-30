import { site } from "@/lib/site";

export function Logo({ tagline }: { tagline?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="grid shrink-0 grid-cols-2 gap-1 max-[359px]:hidden" aria-hidden>
        <span className="h-3 w-3 rounded-[4px] bg-accent" />
        <span className="h-3 w-3 rounded-[4px] bg-accent/25" />
        <span className="h-3 w-3 rounded-[4px] bg-accent/45" />
        <span className="h-3 w-3 rounded-[4px] bg-accent/70" />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate font-display text-base font-bold tracking-tight sm:text-lg">{site.name}</span>
        {tagline && <span className="mt-1 hidden whitespace-nowrap text-[11px] font-medium text-muted sm:block">{tagline}</span>}
      </span>
    </span>
  );
}
