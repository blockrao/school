import { type DeadlineInput, type DeadlineState, deadlineState } from "@/lib/deadline";
import { cn } from "@/lib/utils";

export type DeadlineStatus = DeadlineState["status"];

/**
 * Colour + rule-style are derived from the computed status, never passed in directly —
 * this is what guarantees margin red only ever appears for deadlines 0–7 days away.
 */
export const deadlineMarginStatusClasses: Record<DeadlineStatus, string> = {
  "closing-soon": "text-margin-red border-margin-red",
  "deadline-day": "text-margin-red border-margin-red",
  open: "text-ink border-ink",
  "open-no-deadline": "text-ink border-ink",
  upcoming: "text-ink border-ink border-dashed",
  "not-announced": "text-slate border-slate",
  closed: "text-slate border-slate",
  "seats-now": "text-ink border-ink",
};

export function DeadlineMargin({
  now = new Date(),
  className,
  ...input
}: DeadlineInput & { now?: Date; className?: string }) {
  const state = deadlineState(input, now);

  return (
    <div
      className={cn(
        "flex h-26 overflow-hidden rounded-md border border-rule bg-copy-white",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-20 flex-col justify-center gap-0.5 border-r-2 p-2.5 text-meta",
          deadlineMarginStatusClasses[state.status],
        )}
      >
        <span>{state.top}</span>
        <span className="font-display font-bold text-margin-big">{state.big}</span>
        <span>{state.bottom}</span>
      </div>
      <div
        className="flex-1"
        style={{
          backgroundImage:
            "repeating-linear-gradient(var(--color-copy-white) 0 19px, var(--color-rule-soft) 19px 20px)",
        }}
      />
    </div>
  );
}
