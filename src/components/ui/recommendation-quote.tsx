import { cn } from "@/lib/utils";

/** Moderated before publishing. Relationship to the teacher always shown — never a star rating. */
export function RecommendationQuote({
  quote,
  name,
  relationship,
  className,
}: {
  quote: string;
  name: string;
  relationship: string;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-rule bg-copy-white p-3.5",
        className,
      )}
    >
      <blockquote className="text-body leading-relaxed">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="text-body text-muted-ink">
        <b className="font-semibold text-ink">{name}</b> · {relationship}
      </figcaption>
    </figure>
  );
}
