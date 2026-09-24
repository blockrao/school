import { cn } from "@/lib/utils";

const STALE_AFTER_DAYS = 7;

function formatDaysAgo(daysAgo: number) {
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  return `${daysAgo} days ago`;
}

/**
 * Canonical freshness line for any verified fact: "Checked N days ago · <source>".
 * Past 7 days it switches to the stale treatment — pencil-yellow dot, bold text —
 * per the CLAUDE.md rule that freshness must degrade visibly, not just numerically.
 */
export function FreshnessLine({
  daysAgo,
  source,
  verb = "Checked",
  staleNote = "rechecking",
  className,
}: {
  daysAgo: number;
  source: string;
  verb?: string;
  staleNote?: string;
  className?: string;
}) {
  const stale = daysAgo > STALE_AFTER_DAYS;

  if (stale) {
    return (
      <span className={cn("flex items-center gap-1.5 text-meta font-semibold text-ink", className)}>
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-pencil-yellow" />
        {verb} {formatDaysAgo(daysAgo)} — {staleNote}
      </span>
    );
  }

  return (
    <span className={cn("text-meta text-slate", className)}>
      {verb} {formatDaysAgo(daysAgo)} · {source}
    </span>
  );
}

/** Unknown-fact placeholder. Never guess a value — show this instead. */
export function NotYetPublished({ className }: { className?: string }) {
  return <span className={cn("text-meta text-slate", className)}>Not yet published</span>;
}
