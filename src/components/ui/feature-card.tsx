import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { cn } from "@/lib/utils";

export function FeatureCard({
  eyebrow,
  meta,
  name,
  subtitle,
  blurb,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: {
  eyebrow: string;
  meta: string;
  name: string;
  subtitle: string;
  blurb: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-rule bg-copy-white", className)}>
      <div className="flex justify-between gap-2 border-b border-rule-soft px-3.5 py-2.5">
        <span className="font-display text-card font-semibold">{eyebrow}</span>
        <span className="text-body text-muted-ink">{meta}</span>
      </div>
      <div className="flex gap-3 p-3.5">
        <PhotoPlaceholder className="h-22 w-18" />
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-card font-semibold">{name}</span>
          <span className="text-body text-muted-ink">{subtitle}</span>
          <span className="mt-1 text-body leading-snug">{blurb}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-rule-soft">
        <a
          href={primaryHref}
          className="flex min-h-11 items-center justify-center border-r border-rule-soft font-semibold text-ruled-blue"
        >
          {primaryLabel}
        </a>
        <a
          href={secondaryHref}
          className="flex min-h-11 items-center justify-center font-semibold text-ruled-blue"
        >
          {secondaryLabel}
        </a>
      </div>
    </div>
  );
}
