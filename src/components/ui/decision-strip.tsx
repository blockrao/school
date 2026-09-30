import { StatusPill } from "@/components/ui/badges";
import type { DecisionSlot } from "@/lib/decision-strip";
import { cn } from "@/lib/utils";

/**
 * Increment 5 — design C4/C5's "At a glance" strip. Purely presentational:
 * it renders whatever shape `buildDecisionStrip()` (src/lib/decision-strip.ts)
 * hands it and has no idea which table, if any, backed a given slot — that
 * separation is the point (see that file's header comment for why).
 */
export function DecisionStrip({ slots, className }: { slots: DecisionSlot[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-3",
        className,
      )}
    >
      {slots.map((slot) => (
        <div key={slot.id} className="flex flex-col gap-0.5 bg-copy-white p-3">
          <span className="text-meta text-muted-ink">{slot.label}</span>
          {slot.status === "available" ? (
            <>
              {slot.pillStatus ? (
                <StatusPill status={slot.pillStatus} className="w-fit">
                  {slot.value}
                </StatusPill>
              ) : (
                <span className="font-semibold text-body text-ink">{slot.value}</span>
              )}
              {slot.context && <span className="text-meta text-slate">{slot.context}</span>}
            </>
          ) : (
            <span className="text-body text-slate">Not yet verified</span>
          )}
        </div>
      ))}
    </div>
  );
}
