"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { SaveButton } from "@/components/ui/save-button";

const SavedContext = createContext<ReadonlySet<string>>(new Set());

/**
 * Per-visitor "saved" state for a statically cached listing page. The cached
 * HTML (and every crawler) shows the anonymous view; after mount one request to
 * /api/viewer (never cached) fills in which of these schools this visitor saved.
 */
export function ListingViewerProvider({
  schoolIds,
  children,
}: {
  schoolIds: string[];
  children: ReactNode;
}) {
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set());
  const key = schoolIds.join(",");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/viewer?schools=${encodeURIComponent(key)}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ savedIds?: string[] }>) : null))
      .then((v) => {
        if (!cancelled && v?.savedIds?.length) setSaved(new Set(v.savedIds));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);
  return <SavedContext.Provider value={saved}>{children}</SavedContext.Provider>;
}

export function CardSaveButton(props: { schoolId: string; locale: string; span?: string }) {
  const saved = useContext(SavedContext).has(props.schoolId);
  return (
    <SaveButton
      key={saved ? "saved" : "unsaved"}
      schoolId={props.schoolId}
      saved={saved}
      locale={props.locale}
      span={props.span}
    />
  );
}
