import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CompareTable({
  rows,
  className,
}: {
  rows: { label: string; values: ReactNode[] }[];
  className?: string;
}) {
  const columnCount = rows[0]?.values.length ?? 0;

  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-md border border-rule bg-copy-white text-body",
        className,
      )}
      style={{ gridTemplateColumns: `120px repeat(${columnCount}, 1fr)` }}
    >
      {rows.map((row) => (
        <Fragment key={row.label}>
          <span className="border-b border-rule-soft bg-margin-paper p-2 font-semibold last:border-b-0">
            {row.label}
          </span>
          {row.values.map((value, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: values are positional columns, not a keyed list
              key={`${row.label}-${index}`}
              className="border-b border-rule-soft p-2 last:border-b-0"
            >
              {value}
            </span>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
