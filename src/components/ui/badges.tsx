import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const pillBase =
  "inline-flex h-fit items-center rounded-full border px-2.5 py-px text-meta font-semibold";

type StatusPillStatus =
  | "not-announced"
  | "upcoming"
  | "open"
  | "closing-soon"
  | "closed"
  | "results-out";

const statusPillClasses: Record<StatusPillStatus, string> = {
  "not-announced": "border-pill-none-bd bg-copy-white text-muted-ink",
  upcoming: "border-pill-upcoming-bd bg-pill-upcoming-bg text-ink",
  open: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
  "closing-soon": "border-pill-soon-bd bg-pill-soon-bg text-pill-soon-fg",
  closed: "border-pill-closed-bd bg-pill-closed-bg text-muted-ink",
  "results-out": "border-pill-results-bd bg-pill-results-bg text-ruled-blue",
};

/** Search-results status pill. Colour always ships with the text label baked in. */
export function StatusPill({
  status,
  children,
  className,
}: {
  status: StatusPillStatus;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn(pillBase, statusPillClasses[status], className)}>{children}</span>;
}

type SeatPillStatus = "available" | "few" | "waitlist" | "full";

const seatPillClasses: Record<SeatPillStatus, string> = {
  available: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
  few: "border-pill-upcoming-bd bg-pill-upcoming-bg text-ink",
  waitlist: "border-pill-none-bd bg-copy-white text-muted-ink",
  full: "border-pill-closed-bd bg-pill-closed-bg text-muted-ink",
};

/** This-session seat-count pill, e.g. "Seats available · 4". */
export function SeatPill({
  status,
  children,
  className,
}: {
  status: SeatPillStatus;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn(pillBase, seatPillClasses[status], className)}>{children}</span>;
}

/** "This session · 2026–27" / "Next session · 2027–28" outline tag. */
export function SessionTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-fit items-center rounded-sm border border-ink px-2 text-meta font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Sponsored-card / sponsored-listing label. Always paired with the sponsored border, never styling alone. */
export function SponsoredTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-fit items-center rounded-sm border border-pill-none-bd bg-pill-closed-bg px-2 text-meta font-semibold",
        className,
      )}
    >
      Sponsored
    </span>
  );
}

/**
 * "Why this is here" transparency disclosure for a sponsored card (D-089,
 * N-13: sponsored placement is always labelled and never reorders results —
 * this is the label's own explanation, not a settings/ops control). A plain
 * <details>, not a link to a separate page — there's no sponsored-placements
 * program to write a whole guide page about yet (featured_placements has zero
 * rows today), and the honest one-line disclosure doesn't need one.
 */
export function SponsoredWhyDisclosure({ className }: { className?: string }) {
  return (
    <details className={cn("text-meta text-muted-ink", className)}>
      <summary className="cursor-pointer underline">Why this is here</summary>
      <p className="mt-1 max-w-64">
        This school paid to appear here. Sponsorship never changes the order of the schools around
        it.
      </p>
    </details>
  );
}
