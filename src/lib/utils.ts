import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Default `twMerge` doesn't know our custom theme scale names (text-meta, text-body,
 * rounded-sheet, shadow-card, ...) since they don't match Tailwind's built-in T-shirt
 * sizing convention. Without registering them, twMerge silently misclassifies some of
 * them — e.g. `cn("text-meta", "text-ink")` drops "text-meta" entirely, mistaking it
 * for a conflicting text-color utility instead of the unrelated font-size utility it
 * actually is. Registering the scale names fixes conflict resolution for real.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["title-d", "title-m", "section", "card", "body", "meta"],
      radius: ["sheet"],
      shadow: ["card"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
