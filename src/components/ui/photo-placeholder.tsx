import { cn } from "@/lib/utils";

/** Diagonal-stripe placeholder for a teacher photo that hasn't been uploaded yet. */
export function PhotoPlaceholder({ className }: { className?: string }) {
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
