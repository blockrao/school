import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type VerificationChipVariant = "verified" | "not-verified" | "claimed" | "not-claimed";

const variantClasses: Record<VerificationChipVariant, string> = {
  verified: "border-pill-open-bd text-pill-open-fg",
  "not-verified": "border-dashed border-sponsored-border text-muted-ink",
  claimed: "border-pill-results-bd bg-pill-results-bg text-ruled-blue font-semibold",
  "not-claimed": "border-dashed border-sponsored-border text-muted-ink font-semibold",
};

const checkmarkVariants = new Set<VerificationChipVariant>(["verified", "claimed"]);

/**
 * Only render this for checks that passed or a claim that happened. Never use it
 * to represent a failed or pending check — those get no chip at all.
 */
export function VerificationChip({
  variant,
  children,
  className,
}: {
  variant: VerificationChipVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-fit items-center rounded-sm border px-2 py-0.5 text-meta font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {checkmarkVariants.has(variant) && <span aria-hidden="true">✓&nbsp;</span>}
      {children}
    </span>
  );
}
