import { toggleShortlist } from "@/app/[locale]/my/shortlist/actions";
import { cn } from "@/lib/utils";

/** A tiny self-contained form so Save/Saved can live inside a grid of SchoolCards
 * without any client state — the button's own label reflects the state it was
 * rendered with, and submitting flips it via a Server Action. */
export function SaveButton({
  schoolId,
  saved,
  locale,
  labelSave = "Save",
  labelSaved = "Saved",
  span = "col-span-2",
  variant = "outline",
}: {
  schoolId: string;
  saved: boolean;
  locale: string;
  labelSave?: string;
  labelSaved?: string;
  /** Grid column span of the rendered button — "col-span-2" alone, "col-span-1" alongside another button. */
  span?: string;
  /**
   * "outline" (default, unchanged) is every existing call site — SchoolCard
   * grids and the shortlist page, where a quiet bookmark toggle is right.
   * "primary" is a filled, higher-emphasis treatment for a single call site
   * that wants this to read as *the* action on the page (the school entity
   * page's header CTA) — same real toggleShortlist action underneath, only
   * the visual weight changes.
   */
  variant?: "outline" | "primary";
}) {
  return (
    <form action={toggleShortlist} className="contents">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="schoolId" value={schoolId} />
      <input type="hidden" name="saved" value={saved ? "1" : ""} />
      <button
        type="submit"
        aria-pressed={saved}
        className={cn(
          span,
          "flex h-11 items-center justify-center rounded-md border font-semibold",
          variant === "primary"
            ? saved
              ? "border-so-accent bg-so-accent-soft text-so-accent"
              : "border-so-accent bg-so-accent px-5 text-so-accent-ink"
            : saved
              ? "border-ruled-blue bg-pill-results-bg text-ruled-blue"
              : "border-line-blue text-ink",
        )}
      >
        {saved ? labelSaved : labelSave}
      </button>
    </form>
  );
}
