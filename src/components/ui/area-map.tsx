"use client";

import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

/**
 * Free, no-API-key MapLibre-style basemap (https://openfreemap.org). CLAUDE.md
 * requires MapLibre GL with no Google Maps JS but doesn't name a tile provider —
 * this is a reasonable default for a lazy-loaded, low-traffic map; swap for a
 * paid provider (MapTiler/Stadia) before this needs real production tile volume.
 */
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export type AreaMapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  href?: string;
  /**
   * 'locality' | 'pincode' geocode precision. Every Jaipur school is one of
   * these — never exact — so points always render as a soft, radius-scaled
   * circle (an "area"), never a sharp pin. Wider circle = less precise.
   */
  precision: "locality" | "pincode" | string;
};

const RADIUS_METERS_BY_PRECISION: Record<string, number> = {
  locality: 500,
  pincode: 1500,
};

function metersToPixelsAtLat(meters: number, lat: number, zoom: number): number {
  const earthCircumference = 40075017;
  const metersPerPixel = (earthCircumference * Math.cos((lat * Math.PI) / 180)) / 2 ** (zoom + 8);
  return meters / metersPerPixel;
}

export function AreaMap({
  points,
  centerLat,
  centerLng,
  zoom = 12,
}: {
  points: AreaMapPoint[];
  centerLat: number;
  centerLng: number;
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Increment 11 closure finding (Prav's V2 brief, Section 22/27 — "no broken
  // map"): MapLibre's constructor throws synchronously (GPUInitializationError)
  // when WebGL2 isn't available (older browsers, some crawler/headless
  // renderers, embedded webviews). That throw happened inside this effect with
  // nothing catching it, so React's nearest error boundary caught it and the
  // ENTIRE page crashed to "Something went wrong" — confirmed reproducible in
  // production on every school with a geocode. A map failure must only ever
  // disable the map, never take down the page around it.
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [centerLng, centerLat],
        zoom,
        // compact:false — attribution (OpenStreetMap contributors, OpenFreeMap) must
        // be directly visible, not hidden behind a click-to-expand "i" icon.
        attributionControl: { compact: false },
      });
    } catch {
      setMapFailed(true);
      return;
    }
    // Async failures (style/tile load errors) surface here rather than throwing —
    // same graceful-degradation contract as the constructor try/catch above.
    map.on("error", () => setMapFailed(true));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      const updateRadii = () => {
        const currentZoom = map.getZoom();
        for (const point of points) {
          const radiusMeters = RADIUS_METERS_BY_PRECISION[point.precision] ?? 800;
          const radiusPx = metersToPixelsAtLat(radiusMeters, point.lat, currentZoom);
          if (map.getLayer(`area-${point.id}`)) {
            map.setPaintProperty(`area-${point.id}`, "circle-radius", radiusPx);
          }
        }
      };

      for (const point of points) {
        const sourceId = `area-${point.id}`;
        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [point.lng, point.lat] },
          },
        });
        map.addLayer({
          id: sourceId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": metersToPixelsAtLat(
              RADIUS_METERS_BY_PRECISION[point.precision] ?? 800,
              point.lat,
              zoom,
            ),
            "circle-color": "#2a5dab",
            "circle-opacity": 0.18,
            "circle-stroke-color": "#2a5dab",
            "circle-stroke-width": 1.5,
            "circle-stroke-opacity": 0.6,
          },
        });

        const popup = new maplibregl.Popup({ offset: 8, closeButton: false }).setText(point.label);
        map.on("mouseenter", sourceId, (e) => {
          map.getCanvas().style.cursor = "pointer";
          popup.setLngLat(e.lngLat).addTo(map);
        });
        map.on("mouseleave", sourceId, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
        if (point.href) {
          map.on("click", sourceId, () => {
            window.location.href = point.href as string;
          });
        }
      }

      map.on("zoom", updateRadii);
    });

    return () => map.remove();
  }, [points, centerLat, centerLng, zoom]);

  if (mapFailed) {
    return (
      <div
        role="note"
        className="flex h-80 w-full items-center justify-center rounded-md border border-rule bg-margin-paper p-4 text-center text-body text-muted-ink md:h-96"
      >
        Map unavailable in this browser. The address above is still accurate.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Approximate map of school locations in this area"
      className="h-80 w-full overflow-hidden rounded-md border border-rule md:h-96"
    />
  );
}
