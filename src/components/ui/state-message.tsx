import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function StateMessage({
  borderClass,
  title,
  description,
  children,
  className,
}: {
  borderClass: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 border-l-2 py-1 pl-3.5", borderClass, className)}>
      <span className="font-display text-card font-semibold">{title}</span>
      <span className="text-body text-muted-ink">{description}</span>
      {children}
    </div>
  );
}

/** No results for the current filters. Always offer a next step — never a dead end. */
export function EmptyState({
  title,
  description,
  nextStepLabel,
  nextStepHref,
  className,
}: {
  title: string;
  description: string;
  nextStepLabel: string;
  nextStepHref: string;
  className?: string;
}) {
  return (
    <StateMessage
      borderClass="border-slate"
      title={title}
      description={description}
      className={className}
    >
      <a href={nextStepHref} className="font-semibold text-ruled-blue">
        {nextStepLabel}
      </a>
    </StateMessage>
  );
}

/** Load failure. Explain what happened and give a retry — never blame the user. */
export function ErrorState({
  title,
  description,
  retryLabel = "Try again",
  onRetry,
  className,
}: {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <StateMessage
      borderClass="border-ink"
      title={title}
      description={description}
      className={className}
    >
      <Button variant="secondary" size="sm" className="self-start" onClick={onRetry}>
        {retryLabel}
      </Button>
    </StateMessage>
  );
}
