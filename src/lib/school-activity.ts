import type { PublicSchoolEvent, PublicSchoolJob, PublicSchoolNews } from "@/contracts";
import { type EventTemporalStatus, eventTemporalStatus } from "@/lib/event-status";
import { type JobStatus, jobStatus } from "@/lib/job-status";

/**
 * "What's happening" feed (high-leverage change #2, 29 Sep 2026) — merges a
 * school's News, Events and Jobs into one ordered feed for display. This is
 * a presentation-layer projection only: each domain keeps its own table,
 * provenance, moderation and canonical page exactly as before (the doc's
 * "don't build a universal content table, keep domain models specific"
 * principle) — this module only decides *display order* across the three
 * arrays the school page already fetches.
 *
 * Upcoming/open items sort first (soonest first), so a parent sees what's
 * actionable now ahead of what's archival; everything else (completed
 * events, closed/filled jobs, news — which has no "upcoming" state) sorts
 * by recency, most recent first.
 */
export type SchoolActivityItem =
  | { kind: "news"; sortAt: Date; upcoming: false; data: PublicSchoolNews }
  | {
      kind: "event";
      sortAt: Date;
      upcoming: boolean;
      status: EventTemporalStatus;
      data: PublicSchoolEvent;
    }
  | { kind: "job"; sortAt: Date; upcoming: boolean; status: JobStatus; data: PublicSchoolJob };

export function buildSchoolActivityFeed(
  news: PublicSchoolNews[],
  events: PublicSchoolEvent[],
  jobs: PublicSchoolJob[],
  now: Date,
): SchoolActivityItem[] {
  const items: SchoolActivityItem[] = [
    ...news.map(
      (post): SchoolActivityItem => ({
        kind: "news",
        sortAt: new Date(post.published_at),
        upcoming: false,
        data: post,
      }),
    ),
    ...events.map((event): SchoolActivityItem => {
      const status = eventTemporalStatus(
        {
          startsAt: new Date(event.starts_at),
          endsAt: event.ends_at ? new Date(event.ends_at) : null,
          cancelledAt: event.cancelled_at ? new Date(event.cancelled_at) : null,
        },
        now,
      );
      return {
        kind: "event",
        sortAt: new Date(event.starts_at),
        upcoming: status === "upcoming" || status === "ongoing",
        status,
        data: event,
      };
    }),
    ...jobs.map((job): SchoolActivityItem => {
      const status = jobStatus(
        {
          closesAt: job.closes_at ? new Date(job.closes_at) : null,
          filledAt: job.filled_at ? new Date(job.filled_at) : null,
          cancelledAt: job.cancelled_at ? new Date(job.cancelled_at) : null,
        },
        now,
      );
      return {
        kind: "job",
        // No closesAt on an open-ended posting — created_at is the best
        // available recency signal, matching the school-page job list's
        // existing default order (public-adapter.ts orders by created_at desc).
        sortAt: new Date(job.closes_at ?? job.created_at),
        upcoming: status === "open",
        status,
        data: job,
      };
    }),
  ];

  items.sort((a, b) => {
    if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
    return a.upcoming
      ? a.sortAt.getTime() - b.sortAt.getTime()
      : b.sortAt.getTime() - a.sortAt.getTime();
  });

  return items;
}
