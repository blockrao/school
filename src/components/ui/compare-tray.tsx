import Link from "next/link";
import { cn } from "@/lib/utils";

export function CompareTray({
  selectedCount,
  totalCount,
  clearHref,
  compareHref,
  className,
}: {
  selectedCount: number;
  totalCount: number;
  clearHref: string;
  compareHref: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 rounded-md bg-ink px-3.5 py-3 text-copy-white",
        className,
      )}
    >
      <span className="text-body">
        <b>
          {selectedCount} of {totalCount}
        </b>{" "}
        selected
      </span>
      <span className="flex gap-1.5">
        <Link
          href={clearHref}
          className="flex h-10 items-center rounded-md border border-slate px-3 text-body"
        >
          Clear
        </Link>
        <Link
          href={compareHref}
          className="flex h-10 items-center rounded-md bg-copy-white px-4 font-semibold text-ink"
        >
          Compare
        </Link>
      </span>
    </div>
  );
}
