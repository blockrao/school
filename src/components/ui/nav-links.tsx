import Link from "next/link";
import { cn } from "@/lib/utils";

type LinkItem = { label: string; href: string; active?: boolean };

/** List/Map segmented control. Rendered as links — the view is URL state, not client state. */
export function ViewToggle({ items, className }: { items: LinkItem[]; className?: string }) {
  return (
    <div
      className={cn("flex overflow-hidden rounded-md border border-line-blue text-body", className)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex h-10 items-center px-3.5 font-semibold",
            item.active ? "bg-ruled-blue text-copy-white" : "text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/** "Open now 8 · Closing soon 3 · Upcoming 3" segmented counts, as links. */
export function CountToggleGroup({ items, className }: { items: LinkItem[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid auto-cols-auto grid-flow-col overflow-hidden rounded-md border border-line-blue text-body font-semibold",
        className,
      )}
    >
      {items.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex h-10 items-center px-3",
            index > 0 && "border-l border-line-blue",
            item.active ? "bg-ruled-blue text-copy-white" : "text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/** Overview / Admissions / Fees / Facilities / Teachers — underline tabs, as links. */
export function ResultTabs({ items, className }: { items: LinkItem[]; className?: string }) {
  return (
    <div
      className={cn("flex overflow-x-auto border-b border-rule [scrollbar-width:none]", className)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex h-12 items-center whitespace-nowrap border-b-3 px-3",
            item.active
              ? "border-ruled-blue font-semibold text-ruled-blue"
              : "border-transparent font-medium text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
