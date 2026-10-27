import { site } from "@/lib/site";

export function Logo({ tagline }: { tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid grid-cols-2 gap-1" aria-hidden>
        <span className="h-3 w-3 rounded-[4px] bg-accent" />
        <span className="h-3 w-3 rounded-[4px] bg-accent/25" />
        <span className="h-3 w-3 rounded-[4px] bg-accent/45" />
        <span className="h-3 w-3 rounded-[4px] bg-accent/70" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-tight">{site.name}</span>
        {tagline && <span className="mt-1 text-[11px] font-medium text-muted">{tagline}</span>}
      </span>
    </span>
  );
}
