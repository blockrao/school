import { freshnessState } from "@/lib/freshness";
import { cn } from "@/lib/utils";

function formatDaysAgo(daysAgo: number) {
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  return `${daysAgo} days ago`;
}

/**
 * Never implies a fact was checked when it was only retrieved. `verifiedAt` present
 * → "Checked N days ago · <source>" (a human actually confirmed this). `verifiedAt`
 * absent → "From <source> · retrieved <date>" — an absolute date, not a relative "N
 * days ago", so it can't visually read as the higher-trust verified phrasing. Staleness
 * comes from the shared `freshnessState` decision (also unit-tested independently).
 */
export function FreshnessLine({
  source,
  retrievedAt,
  verifiedAt,
  now = new Date(),
  staleNote = "rechecking",
  className,
}: {
  source: string;
  retrievedAt: Date;
  verifiedAt?: Date | null;
  now?: Date;
  staleNote?: string;
  className?: string;
}) {
  const state = freshnessState({ retrievedAt, verifiedAt }, now);

  const text =
    state.mode === "checked"
      ? `Checked ${formatDaysAgo(state.daysAgo)}`
      : `From ${source} · retrieved ${state.dateLabel}`;

  if (state.stale) {
    return (
      <span className={cn("flex items-center gap-1.5 text-meta font-semibold text-ink", className)}>
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-pencil-yellow" />
        {state.mode === "checked" ? `${text} — ${staleNote}` : text}
      </span>
    );
  }

  return (
    <span className={cn("text-meta text-slate", className)}>
      {state.mode === "checked" ? `${text} · ${source}` : text}
    </span>
  );
}

/** Unknown-fact placeholder. Never guess a value — show this instead. */
export function NotYetPublished({ className }: { className?: string }) {
  return <span className={cn("text-meta text-slate", className)}>Not yet published</span>;
}
