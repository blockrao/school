/**
 * Derives a school job posting's display status from its dates, never from a
 * stored column — mirrors event-status.ts's eventTemporalStatus() /
 * deadline.ts's deadlineState() exactly: the canonical page's IDENTITY (its
 * slug/job_code) is permanent, but the status it shows must always reflect
 * the current time and the school's own actions, so it can never go stale
 * the way a manually-set "status" column could.
 */
export type JobStatus = "cancelled" | "filled" | "closed" | "open";

export type JobStatusInput = {
  closesAt?: Date | null;
  filledAt?: Date | null;
  cancelledAt?: Date | null;
};

export function jobStatus(input: JobStatusInput, now: Date): JobStatus {
  if (input.cancelledAt) return "cancelled";
  if (input.filledAt) return "filled";
  if (input.closesAt && now > input.closesAt) return "closed";
  return "open";
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  cancelled: "Cancelled",
  filled: "Filled",
  closed: "Closed",
  open: "Open",
};
