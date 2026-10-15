"use client";

import { useEffect, useState } from "react";

export type Viewer = { signedIn: boolean; saved: boolean };

const ANON: Viewer = { signedIn: false, saved: false };
const inflight = new Map<string, Promise<Viewer>>();

/**
 * Per-visitor state for a statically cached school page: is this person signed
 * in, and have they saved this school. Resolved after mount from /api/viewer
 * (never cached). The default is the anonymous view, which is also exactly
 * what crawlers and the cached HTML show.
 */
export function useViewer(schoolId: string): Viewer {
  const [viewer, setViewer] = useState<Viewer>(ANON);
  useEffect(() => {
    let cancelled = false;
    let p = inflight.get(schoolId);
    if (!p) {
      p = fetch(`/api/viewer?school=${encodeURIComponent(schoolId)}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<Viewer>) : ANON))
        .catch(() => ANON);
      inflight.set(schoolId, p);
      p.finally(() => setTimeout(() => inflight.delete(schoolId), 2000));
    }
    p.then((v) => {
      if (!cancelled) setViewer(v);
    });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);
  return viewer;
}
