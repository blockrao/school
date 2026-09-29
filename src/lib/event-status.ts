/**
 * Derives a school event's display status from its dates, never from a
 * stored column — mirrors deadline.ts's deadlineState() exactly: the
 * canonical page's IDENTITY (its slug/event_code) is permanent, but what
 * status it shows must always reflect the current time, so it can never go
 * stale the way a manually-set "status" column could (SEO/GEO follow-up,
 * Prav 29 Sep 2026: "unique canonical page for each event and stays there
 * forever, just the status changes, like Upcoming, completed").
 */
export type EventTemporalStatus = "cancelled" | "upcoming" | "ongoing" | "completed";

export type EventStatusInput = {
  startsAt: Date;
  endsAt?: Date | null;
  cancelledAt?: Date | null;
};

export function eventTemporalStatus(input: EventStatusInput, now: Date): EventTemporalStatus {
  if (input.cancelledAt) return "cancelled";

  const end = input.endsAt ?? input.startsAt;
  if (now < input.startsAt) return "upcoming";
  if (now <= end) return "ongoing";
  return "completed";
}

export const EVENT_STATUS_LABEL: Record<EventTemporalStatus, string> = {
  cancelled: "Cancelled",
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
};
