import { NextResponse } from "next/server";
import { type AnalyticsEventType, logAnalyticsEvent } from "@/lib/analytics";

// Client-side analytics events only reach the server through here — see
// src/lib/analytics.ts's header for the full event-type list and why this
// exists (P1.8, Activity & Admissions Consolidation). Used by ShareBar via
// navigator.sendBeacon, which POSTs a Blob with no custom headers, so this
// route can't require a content-type or an auth header.
const CLIENT_EVENT_TYPES: readonly AnalyticsEventType[] = ["share", "admission_external_click"];

interface TrackPayload {
  eventType?: string;
  entityType?: string;
  entityId?: string;
  schoolId?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  let body: TrackPayload;
  try {
    // sendBeacon delivers a Blob with a text/plain content-type even when
    // constructed from a JSON string, so parse the raw text rather than
    // relying on request.json()'s content-type check.
    const text = await request.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!CLIENT_EVENT_TYPES.includes(body.eventType as AnalyticsEventType)) {
    return NextResponse.json({ error: "unknown event type" }, { status: 400 });
  }

  await logAnalyticsEvent({
    eventType: body.eventType as AnalyticsEventType,
    entityType: body.entityType,
    entityId: body.entityId,
    schoolId: body.schoolId,
    metadata: body.metadata,
  });

  // sendBeacon ignores the response, but respond sanely for any caller that
  // does await (e.g. a fetch(..., {keepalive:true}) fallback).
  return NextResponse.json({ ok: true });
}
