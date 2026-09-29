import "server-only";
import { logAnalyticsEvent } from "@/lib/analytics";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

export type ClassLevel = {
  code: string;
  sort_order: number;
  label_en: string;
  label_hi: string | null;
};

export async function listClassLevels(): Promise<ClassLevel[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("class_levels")
    .select("code, sort_order, label_en, label_hi")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

/** The first school the signed-in user is a member of, or null if they're not a member of any. */
export async function getMySchoolId(): Promise<string | null> {
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) return null;

  const { data } = await supabase
    .from("school_members")
    .select("school_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return data?.school_id ?? null;
}

export type PortalSeatRow = {
  id: string;
  class_code: string;
  public_status: "open" | "limited" | "waitlist" | "closed";
  range_label: string | null;
  confirmed_at: string | null;
  reported_at: string;
  academic_year: string;
};

export async function listSeatStatusForSchool(
  schoolId: string,
  academicYear: string,
): Promise<PortalSeatRow[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("seat_status")
    .select("id, class_code, public_status, range_label, confirmed_at, reported_at, academic_year")
    .eq("school_id", schoolId)
    .eq("academic_year", academicYear)
    .order("reported_at", { ascending: false });
  return (data as PortalSeatRow[] | null) ?? [];
}

export type PortalNotice = {
  id: string;
  url: string;
  review: "pending" | "approved" | "edited" | "rejected" | "needs_triage";
  discovered_at: string;
  extraction: Record<string, unknown> | null;
};

export async function listNoticesForSchool(schoolId: string): Promise<PortalNotice[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("admission_notices")
    .select("id, url, review, discovered_at, extraction")
    .eq("school_id", schoolId)
    .order("discovered_at", { ascending: false });
  return (data as PortalNotice[] | null) ?? [];
}

export type PortalEnquiry = {
  id: string;
  class_code: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

export async function listEnquiriesForSchool(schoolId: string): Promise<PortalEnquiry[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("enquiries")
    .select("id, class_code, message, status, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

export type PortalPost = {
  id: string;
  kind: "news" | "press";
  title: string;
  body: string;
  source_url: string | null;
  review: "pending" | "approved" | "edited" | "rejected" | "needs_triage";
  slug: string;
  tier: "organic" | "featured" | "press_release";
  requested_tier: "organic" | "featured" | "press_release" | null;
  listing_requested_at: string | null;
  listing_review: "pending" | "approved" | "edited" | "rejected" | "needs_triage" | null;
  rejection_reason: string | null;
  withdrawn_at: string | null;
  created_at: string;
};

export async function listPostsForSchool(schoolId: string): Promise<PortalPost[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_posts")
    .select(
      "id, kind, title, body, source_url, review, slug, tier, requested_tier, listing_requested_at, listing_review, rejection_reason, withdrawn_at, created_at",
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return (data as PortalPost[] | null) ?? [];
}

export async function getPostForSchool(
  postId: string,
  schoolId: string,
): Promise<PortalPost | null> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_posts")
    .select(
      "id, kind, title, body, source_url, review, slug, tier, requested_tier, listing_requested_at, listing_review, rejection_reason, withdrawn_at, created_at",
    )
    .eq("id", postId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return (data as PortalPost | null) ?? null;
}

/**
 * Gates a post into the site-wide /news aggregator review queue — a separate
 * step from publishing to the school's own page (SEO/GEO follow-up, 29 Sep
 * 2026). As of 20260929090000_activity_admissions_v1.sql (P0.1/P1.5), this
 * also doubles as the resubmission action: setting listing_requested_at/
 * listing_review here is exactly what "Request → Rejected → Edit →
 * Resubmit" needs on the way back in, no separate resubmit function
 * required. The RLS/trigger split (school_posts_member_update +
 * school_posts_enforce_edit_lock) is what makes this always attemptable
 * instead of gated on "not already requested".
 */
export async function requestPostListing(postId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_posts")
    .update({
      listing_requested_at: new Date().toISOString(),
      listing_review: "pending",
      rejection_reason: null,
    })
    .eq("id", postId)
    .eq("school_id", schoolId);
  if (!error) {
    await logAnalyticsEvent({
      eventType: "listing_requested",
      entityType: "news",
      entityId: postId,
      schoolId,
    });
  }
  return !error;
}

/**
 * Edits a post's own content — blocked by school_posts_enforce_edit_lock
 * while listing_review = 'pending', and demotes an already-approved+listed
 * post to 'edited' so the site-wide /news aggregator keeps showing the
 * last-approved version until ops re-reviews (P1.4/P0.1). Returns false
 * (rather than throwing) on the trigger's RAISE EXCEPTION so callers can
 * show a friendly "can't edit while under review" message.
 */
export async function updatePost(
  postId: string,
  schoolId: string,
  fields: { title: string; body: string; sourceUrl: string | null },
): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_posts")
    .update({ title: fields.title, body: fields.body, source_url: fields.sourceUrl })
    .eq("id", postId)
    .eq("school_id", schoolId);
  return !error;
}

/** News' equivalent of cancelEvent/cancelJob — a retraction, pulled from both feeds (P0.1). */
export async function withdrawPost(postId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_posts")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("school_id", schoolId);
  return !error;
}

export type PortalEvent = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  class_codes: string[];
  registration_url: string | null;
  source_url: string | null;
  cancelled_at: string | null;
  slug: string;
  listing_requested_at: string | null;
  listing_review: "pending" | "approved" | "edited" | "rejected" | "needs_triage" | null;
  rejection_reason: string | null;
  created_at: string;
};

export async function listEventsForSchool(schoolId: string): Promise<PortalEvent[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_events")
    .select(
      "id, event_type, title, description, starts_at, ends_at, location, class_codes, registration_url, source_url, cancelled_at, slug, listing_requested_at, listing_review, rejection_reason, created_at",
    )
    .eq("school_id", schoolId)
    .order("starts_at", { ascending: true });
  return (data as PortalEvent[] | null) ?? [];
}

export async function getEventForSchool(
  eventId: string,
  schoolId: string,
): Promise<PortalEvent | null> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_events")
    .select(
      "id, event_type, title, description, starts_at, ends_at, location, class_codes, registration_url, source_url, cancelled_at, slug, listing_requested_at, listing_review, rejection_reason, created_at",
    )
    .eq("id", eventId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return (data as PortalEvent | null) ?? null;
}

/** Same listing-request gate as requestPostListing, for the school's own events — also the resubmit action, see requestPostListing's comment. */
export async function requestEventListing(eventId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_events")
    .update({
      listing_requested_at: new Date().toISOString(),
      listing_review: "pending",
      rejection_reason: null,
    })
    .eq("id", eventId)
    .eq("school_id", schoolId);
  if (!error) {
    await logAnalyticsEvent({
      eventType: "listing_requested",
      entityType: "event",
      entityId: eventId,
      schoolId,
    });
  }
  return !error;
}

/** Lets a school withdraw its own event without deleting the row — the canonical page persists. */
export async function cancelEvent(eventId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_events")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("school_id", schoolId);
  return !error;
}

/** Edits an event's own content — see updatePost's comment for the edit-lock/demotion behavior. */
export async function updateEvent(
  eventId: string,
  schoolId: string,
  fields: {
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    location: string | null;
    registrationUrl: string | null;
    sourceUrl: string | null;
  },
): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_events")
    .update({
      title: fields.title,
      description: fields.description,
      starts_at: fields.startsAt,
      ends_at: fields.endsAt,
      location: fields.location,
      registration_url: fields.registrationUrl,
      source_url: fields.sourceUrl,
    })
    .eq("id", eventId)
    .eq("school_id", schoolId);
  return !error;
}

export type PortalJob = {
  id: string;
  title: string;
  employment_type: "full_time" | "part_time" | "contract" | "visiting";
  subject: string | null;
  description: string;
  experience_required: string | null;
  salary_range: string | null;
  location: string | null;
  apply_url: string | null;
  apply_email: string | null;
  class_codes: string[];
  closes_at: string | null;
  filled_at: string | null;
  cancelled_at: string | null;
  slug: string;
  listing_requested_at: string | null;
  listing_review: "pending" | "approved" | "edited" | "rejected" | "needs_triage" | null;
  rejection_reason: string | null;
  created_at: string;
};

export async function listJobsForSchool(schoolId: string): Promise<PortalJob[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_jobs")
    .select(
      "id, title, employment_type, subject, description, experience_required, salary_range, location, apply_url, apply_email, class_codes, closes_at, filled_at, cancelled_at, slug, listing_requested_at, listing_review, rejection_reason, created_at",
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return (data as PortalJob[] | null) ?? [];
}

export async function getJobForSchool(jobId: string, schoolId: string): Promise<PortalJob | null> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_jobs")
    .select(
      "id, title, employment_type, subject, description, experience_required, salary_range, location, apply_url, apply_email, class_codes, closes_at, filled_at, cancelled_at, slug, listing_requested_at, listing_review, rejection_reason, created_at",
    )
    .eq("id", jobId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return (data as PortalJob | null) ?? null;
}

/** Same listing-request gate as requestPostListing/requestEventListing, for the school's own jobs — also the resubmit action, see requestPostListing's comment. */
export async function requestJobListing(jobId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_jobs")
    .update({
      listing_requested_at: new Date().toISOString(),
      listing_review: "pending",
      rejection_reason: null,
    })
    .eq("id", jobId)
    .eq("school_id", schoolId);
  if (!error) {
    await logAnalyticsEvent({
      eventType: "listing_requested",
      entityType: "job",
      entityId: jobId,
      schoolId,
    });
  }
  return !error;
}

/** Lets a school mark a job filled without deleting the row — the canonical page persists. */
export async function markJobFilled(jobId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_jobs")
    .update({ filled_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("school_id", schoolId);
  return !error;
}

/** Lets a school withdraw its own job posting without deleting the row. */
export async function cancelJob(jobId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_jobs")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("school_id", schoolId);
  return !error;
}

/** Edits a job's own content — see updatePost's comment for the edit-lock/demotion behavior. */
export async function updateJob(
  jobId: string,
  schoolId: string,
  fields: {
    title: string;
    subject: string | null;
    description: string;
    experienceRequired: string | null;
    salaryRange: string | null;
    location: string | null;
    applyUrl: string | null;
    applyEmail: string | null;
    closesAt: string | null;
  },
): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_jobs")
    .update({
      title: fields.title,
      subject: fields.subject,
      description: fields.description,
      experience_required: fields.experienceRequired,
      salary_range: fields.salaryRange,
      location: fields.location,
      apply_url: fields.applyUrl,
      apply_email: fields.applyEmail,
      closes_at: fields.closesAt,
    })
    .eq("id", jobId)
    .eq("school_id", schoolId);
  return !error;
}

export type PortalAdmissionLead = {
  id: string;
  class_code: string;
  academic_year: string;
  full_name: string | null;
  phone: string | null;
  note: string | null;
  status: "new" | "contacted" | "closed";
  created_at: string;
};

/**
 * Admission-leads inbox for a school (29 Sep 2026) — replaces the old
 * "send the parent straight to the school's own form" CTA. `full_name`/
 * `phone` are disclosed here deliberately (unlike listEnquiriesForSchool
 * above, which never exposes them): applying is a single-recipient act the
 * parent consented to when they applied, see submitAdmissionLead in
 * src/app/[locale]/_views/actions.ts.
 */
export async function listAdmissionLeadsForSchool(
  schoolId: string,
): Promise<PortalAdmissionLead[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("admission_leads")
    .select("id, class_code, academic_year, full_name, phone, note, status, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return (data as PortalAdmissionLead[] | null) ?? [];
}

export async function updateAdmissionLeadStatus(
  leadId: string,
  schoolId: string,
  status: "new" | "contacted" | "closed",
  staffUserId: string | undefined,
): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("admission_leads")
    .update({
      status,
      status_updated_by: staffUserId,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("school_id", schoolId);
  return !error;
}
