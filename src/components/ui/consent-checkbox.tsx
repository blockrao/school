import type { ReactNode } from "react";
import { FieldError, invalidFieldBorderClass } from "@/components/ui/field-error";
import { cn } from "@/lib/utils";

/**
 * Native checkbox styled as a custom box via `peer` + `peer-checked` — no JS needed
 * for the checked/unchecked visual, only the browser's own form state. Always starts
 * unchecked — WhatsApp/SMS consent is opt-in, never pre-ticked.
 */
export function ConsentCheckbox({
  name,
  required,
  error,
  children,
  className,
}: {
  name: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const errorId = `${name}-error`;

  return (
    <div className={className}>
      <label
        className={cn(
          "flex items-start gap-3 rounded-md p-3 text-body leading-snug",
          error
            ? invalidFieldBorderClass
            : "border border-line-blue has-[:checked]:border-ruled-blue",
        )}
      >
        <input
          type="checkbox"
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 border-ruled-blue font-bold text-transparent peer-checked:bg-ruled-blue peer-checked:text-copy-white"
        >
          ✓
        </span>
        {children}
      </label>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
