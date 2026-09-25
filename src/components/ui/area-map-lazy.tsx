"use client";

import dynamic from "next/dynamic";
import type { AreaMapPoint } from "@/components/ui/area-map";

/**
 * Lazy client island — MapLibre GL's JS + CSS only ship to the browser once this
 * mounts, keeping it off the school/locality page's first-load JS budget
 * (CLAUDE.md performance budget: no client-side data fetching for first paint,
 * maps are explicitly called out as a lazy island).
 */
const AreaMap = dynamic(() => import("@/components/ui/area-map").then((m) => m.AreaMap), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="flex h-80 w-full items-center justify-center rounded-md border border-rule bg-margin-paper text-body text-muted-ink md:h-96"
    >
      Loading map…
    </div>
  ),
});

export function AreaMapLazy(props: {
  points: AreaMapPoint[];
  centerLat: number;
  centerLng: number;
  zoom?: number;
}) {
  return <AreaMap {...props} />;
}

export type { AreaMapPoint };
