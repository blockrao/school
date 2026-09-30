import { cn } from "@/lib/utils";

/** First letter of up to two significant words — "Tagore School" -> "TS". Not a
 * taxonomy, just a decorative fallback, so this stays a simple heuristic rather
 * than stripping every generic word ("School", "Sr.", "The", …). */
function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ""))
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return letters || "?";
}

/**
 * Placeholder for a photo that hasn't been uploaded yet. With `label` (a
 * school/person name), renders a colored initials avatar instead of the plain
 * diagonal-stripe pattern — still a placeholder, never claiming to be a real
 * photo, but one that gives the page an anchor color instead of an empty box.
 * Existing call sites that don't pass `label` (teacher/feature cards) are
 * unchanged.
 */
export function PhotoPlaceholder({ className, label }: { className?: string; label?: string }) {
  if (label) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-sm bg-ruled-blue font-display font-semibold text-copy-white text-title-m",
          className,
        )}
      >
        {initialsOf(label)}
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn("shrink-0 rounded-sm bg-margin-paper", className)}
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, var(--color-placeholder) 0 8px, var(--color-margin-paper) 8px 16px)",
      }}
    />
  );
}
