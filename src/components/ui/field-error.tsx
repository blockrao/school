/**
 * Distinct-from-deadline error treatment: ink, bold, an outlined icon — never red.
 * Margin red stays reserved for deadlines 0–7 days away.
 */

/** Border to apply to an invalid field's own element, in place of its default border. */
export const invalidFieldBorderClass = "border-3 border-ink";

function ErrorIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="8"
        y1="4.5"
        x2="8"
        y2="9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-meta font-semibold text-ink"
    >
      <ErrorIcon />
      {children}
    </p>
  );
}
