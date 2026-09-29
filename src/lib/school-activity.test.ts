import { describe, expect, it } from "vitest";
import type { PublicSchoolEvent, PublicSchoolJob, PublicSchoolNews } from "@/contracts";
import { buildSchoolActivityFeed } from "@/lib/school-activity";

const now = new Date("2026-09-29T12:00:00.000Z");

function news(overrides: Partial<PublicSchoolNews> = {}): PublicSchoolNews {
  return {
    id: "news-1",
    school_id: "school-1",
    school_slug: "gyan-devi",
    kind: "news",
    title: "Teachers' Day celebration",
    body: "...",
    source_url: null,
    published_at: "2026-09-01T00:00:00.000Z",
    post_code: 1,
    post_slug: "n-1-teachers-day",
    tier: "organic",
    listing_requested_at: null,
    listing_review: null,
    ...overrides,
  };
}

function event(overrides: Partial<PublicSchoolEvent> = {}): PublicSchoolEvent {
  return {
    id: "event-1",
    school_id: "school-1",
    school_slug: "gyan-devi",
    event_code: 1,
    event_slug: "e-1-ptm",
    event_type: "ptm",
    title: "Parent-teacher meeting",
    description: null,
    starts_at: "2026-10-03T03:00:00.000Z",
    ends_at: null,
    location: null,
    class_codes: [],
    registration_url: null,
    source_url: null,
    cancelled_at: null,
    listing_requested_at: null,
    listing_review: null,
    ...overrides,
  };
}

function job(overrides: Partial<PublicSchoolJob> = {}): PublicSchoolJob {
  return {
    id: "job-1",
    school_id: "school-1",
    school_slug: "gyan-devi",
    job_code: 1,
    job_slug: "j-1-pgt-maths",
    title: "PGT Mathematics",
    employment_type: "full_time",
    subject: "Mathematics",
    description: "...",
    experience_required: null,
    salary_range: null,
    location: null,
    apply_url: null,
    apply_email: null,
    class_codes: [],
    closes_at: null,
    filled_at: null,
    cancelled_at: null,
    listing_requested_at: null,
    listing_review: null,
    created_at: "2026-09-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildSchoolActivityFeed", () => {
  it("returns nothing for three empty lists", () => {
    expect(buildSchoolActivityFeed([], [], [], now)).toEqual([]);
  });

  it("puts an upcoming event ahead of past news", () => {
    const feed = buildSchoolActivityFeed([news()], [event()], [], now);
    expect(feed.map((i) => i.kind)).toEqual(["event", "news"]);
  });

  it("puts an open job ahead of a completed event", () => {
    const completedEvent = event({ starts_at: "2026-09-01T00:00:00.000Z" });
    const openJob = job({ closes_at: "2026-10-15T00:00:00.000Z" });
    const feed = buildSchoolActivityFeed([], [completedEvent], [openJob], now);
    expect(feed.map((i) => i.kind)).toEqual(["job", "event"]);
  });

  it("sorts multiple upcoming items soonest-first", () => {
    const soon = event({ id: "e-soon", starts_at: "2026-10-01T00:00:00.000Z" });
    const later = event({ id: "e-later", starts_at: "2026-11-01T00:00:00.000Z" });
    const feed = buildSchoolActivityFeed([], [later, soon], [], now);
    expect(feed.map((i) => (i.kind === "event" ? i.data.id : null))).toEqual(["e-soon", "e-later"]);
  });

  it("sorts multiple non-upcoming items most-recent-first", () => {
    const older = news({ id: "n-older", published_at: "2026-01-01T00:00:00.000Z" });
    const newer = news({ id: "n-newer", published_at: "2026-09-01T00:00:00.000Z" });
    const feed = buildSchoolActivityFeed([older, newer], [], [], now);
    expect(feed.map((i) => (i.kind === "news" ? i.data.id : null))).toEqual(["n-newer", "n-older"]);
  });

  it("treats a cancelled event as non-upcoming even before its start date", () => {
    const cancelled = event({
      starts_at: "2026-10-01T00:00:00.000Z",
      cancelled_at: "2026-09-20T00:00:00.000Z",
    });
    const feed = buildSchoolActivityFeed([], [cancelled], [], now);
    expect(feed[0]?.upcoming).toBe(false);
  });

  it("treats a filled job as non-upcoming", () => {
    const filled = job({ filled_at: "2026-09-25T00:00:00.000Z" });
    const feed = buildSchoolActivityFeed([], [], [filled], now);
    expect(feed[0]?.upcoming).toBe(false);
  });
});
