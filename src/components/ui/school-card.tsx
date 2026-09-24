import type { ReactNode } from "react";
import { SponsoredTag } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { deadlineMarginStatusClasses } from "@/components/ui/deadline-margin";
import type { DeadlineInput } from "@/lib/deadline";
import { deadlineState } from "@/lib/deadline";
import { cn } from "@/lib/utils";

export function SchoolCard({
  name,
  meta,
  sponsored = false,
  deadline,
  now = new Date(),
  status,
  fee,
  freshness,
  actions,
  className,
}: {
  name: string;
  meta: string;
  sponsored?: boolean;
  deadline: DeadlineInput;
  now?: Date;
  status: ReactNode;
  fee: ReactNode;
  freshness: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const state = deadlineState(deadline, now);

  return (
    <article
      className={cn(
        "flex overflow-hidden rounded-md border bg-copy-white",
        sponsored ? "border-sponsored-border" : "border-rule",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-18 shrink-0 flex-col gap-0.5 border-r-2 py-2.5 pr-1.5 pl-2.5 text-meta",
          deadlineMarginStatusClasses[state.status],
        )}
      >
        <span>{state.top}</span>
        <span className="font-display text-section font-bold leading-none">{state.big}</span>
        <span>{state.bottom}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        {sponsored && <SponsoredTag className="self-start" />}
        <span className="font-display text-card font-semibold">{name}</span>
        <span className="text-body text-muted-ink">{meta}</span>
        {status}
        <span className="text-body">{fee}</span>
        {freshness}
        <div className="mt-0.5 grid grid-cols-2 gap-2">
          {actions ?? (
            <>
              <Button variant="secondary" size="sm">
                Save
              </Button>
              <Button variant="primary" size="sm">
                Get alert
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
