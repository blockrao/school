"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type PrimaryNavItem = { label: string; href: string; note?: string };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Primary nav — Schools / Admissions / Teachers / Guides / For schools. Real links; only the active-state highlight needs the current route. */
export function PrimaryNav({ items, className }: { items: PrimaryNavItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex h-full items-stretch gap-0.5", className)}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-[3px] flex items-center border-b-3 px-3 text-body",
              active
                ? "border-ruled-blue font-semibold text-ruled-blue"
                : "border-transparent font-medium text-ink hover:text-ruled-blue",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
