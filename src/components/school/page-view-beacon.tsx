"use client";

import { useEffect } from "react";

/**
 * Records a school page view from the browser instead of from the server
 * render, so the page itself stays cacheable and a crawler fetching the HTML
 * no longer causes a database write. Bots that run no JavaScript never fire it.
 */
export function PageViewBeacon({ schoolId }: { schoolId: string }) {
  useEffect(() => {
    const body = JSON.stringify({
      eventType: "page_view",
      entityType: "school",
      entityId: schoolId,
      schoolId,
    });
    try {
      navigator.sendBeacon("/api/track", body);
    } catch {
      // Telemetry only.
    }
  }, [schoolId]);
  return null;
}
