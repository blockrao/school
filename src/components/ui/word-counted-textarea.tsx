"use client";

import { useState } from "react";
import { countWords } from "@/lib/word-count";

/**
 * A plain textarea with a live word count underneath — a visibility aid, not a
 * gate. Increment 3A (docs/ops/2026-09-28-about-en-cleanup.md): about_en had no
 * content contract visible at the point of entry, which is how research/dedup
 * notes ended up in a reader-facing field. This surfaces the existing guideline
 * (docs/guidelines/content-and-trust.md §3) where an editor actually sees it,
 * without blocking a save — the count is informational only, on purpose.
 */
export function WordCountedTextarea({
  name,
  defaultValue,
  rows,
  hint,
  wordLimit,
  className,
}: {
  name: string;
  defaultValue: string;
  rows: number;
  hint: string;
  wordLimit: number;
  className: string;
}) {
  const [wordCount, setWordCount] = useState(() => countWords(defaultValue));

  return (
    <div className="flex flex-col gap-1">
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className={className}
        onChange={(e) => setWordCount(countWords(e.target.value))}
      />
      <p className="text-meta text-muted-ink">
        {hint} ({wordCount} / {wordLimit} words)
      </p>
    </div>
  );
}
