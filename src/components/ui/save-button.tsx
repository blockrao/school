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
}: {
  schoolId: string;
  saved: boolean;
  locale: string;
  labelSave?: string;
  labelSaved?: string;
  /** Grid column span of the rendered button — "col-span-2" alone, "col-span-1" alongside another button. */
  span?: string;
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
          saved
            ? "border-ruled-blue bg-pill-results-bg text-ruled-blue"
            : "border-line-blue text-ink",
        )}
      >
        {saved ? labelSaved : labelSave}
      </button>
    </form>
  );
}
