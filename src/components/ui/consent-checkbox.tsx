import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Native checkbox styled as a custom box via `peer` + `peer-checked` — no JS needed
 * for the checked/unchecked visual, only the browser's own form state.
 */
export function ConsentCheckbox({
  name,
  defaultChecked,
  required,
  children,
  className,
}: {
  name: string;
  defaultChecked?: boolean;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-md border p-3 text-body leading-snug",
        "border-line-blue has-[:checked]:border-ruled-blue",
        className,
      )}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        required={required}
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
  );
}
