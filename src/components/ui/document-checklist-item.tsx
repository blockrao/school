import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocumentChecklistItemVariant = "ready" | "missing";

const variantClasses: Record<DocumentChecklistItemVariant, { badge: string; status: string }> = {
  ready: {
    badge: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
    status: "text-pill-open-fg",
  },
  missing: {
    badge: "border-dashed border-line-blue-strong bg-copy-white text-muted-ink",
    status: "text-muted-ink",
  },
};

export function DocumentChecklistItem({
  variant,
  title,
  status,
  actionLabel,
  actionHref,
  className,
}: {
  variant: DocumentChecklistItemVariant;
  title: string;
  status: string;
  actionLabel: string;
  actionHref: string;
  className?: string;
}) {
  const styles = variantClasses[variant];
  return (
    <div className={cn("flex items-center gap-3 border-b border-rule-soft py-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-bold",
          styles.badge,
        )}
      >
        {variant === "ready" ? "✓" : ""}
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-semibold text-body">{title}</span>
        <span className={cn("text-meta", styles.status)}>{status}</span>
      </span>
      <Button asChild variant={variant === "ready" ? "secondary" : "primary"} size="sm">
        <a href={actionHref}>{actionLabel}</a>
      </Button>
    </div>
  );
}
