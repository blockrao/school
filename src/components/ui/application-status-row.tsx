import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ApplicationStatusTone = "preparing" | "waiting-approval" | "submitted" | "interview";

const toneClasses: Record<ApplicationStatusTone, { border: string; bar: string; pill: string }> = {
  preparing: {
    border: "border-rule",
    bar: "bg-slate",
    pill: "border-pill-none-bd bg-copy-white text-muted-ink",
  },
  "waiting-approval": {
    border: "border-pencil-yellow",
    bar: "bg-pencil-yellow",
    pill: "border-pencil-yellow bg-pill-upcoming-bg text-ink",
  },
  submitted: {
    border: "border-pill-open-bd",
    bar: "bg-board-green",
    pill: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
  },
  interview: {
    border: "border-pill-results-bd",
    bar: "bg-ruled-blue",
    pill: "border-pill-results-bd bg-pill-results-bg text-ruled-blue",
  },
};

export function ApplicationStatusRow({
  tone,
  schoolName,
  statusLabel,
  description,
  actionLabel,
  actionHref,
  actionSlot,
  className,
}: {
  tone: ApplicationStatusTone;
  schoolName: string;
  statusLabel: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  /** For an action that's a mutation (a form, not a link) — e.g. approving an application. Takes precedence over actionLabel/actionHref. */
  actionSlot?: ReactNode;
  className?: string;
}) {
  const styles = toneClasses[tone];
  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-md border bg-copy-white",
        styles.border,
        className,
      )}
    >
      <div className={cn("w-1.5", styles.bar)} />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-body">{schoolName}</span>
          <StatusPillInline className={styles.pill}>{statusLabel}</StatusPillInline>
        </div>
        <span className="text-body text-muted-ink">{description}</span>
        {actionSlot ??
          (actionLabel && actionHref && (
            <Button asChild size="sm" className="self-start">
              <a href={actionHref}>{actionLabel}</a>
            </Button>
          ))}
      </div>
    </div>
  );
}

function StatusPillInline({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={cn("rounded-full border px-2 py-px text-meta font-semibold", className)}>
      {children}
    </span>
  );
}
