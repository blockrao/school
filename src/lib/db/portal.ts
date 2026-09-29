import "server-only";
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
  created_at: string;
};

export async function listPostsForSchool(schoolId: string): Promise<PortalPost[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_posts")
    .select(
      "id, kind, title, body, source_url, review, slug, tier, requested_tier, listing_requested_at, listing_review, created_at",
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return (data as PortalPost[] | null) ?? [];
}

/**
 * Gates a post into the site-wide /news aggregator review queue — a separate
 * step from publishing to the school's own page (SEO/GEO follow-up, 29 Sep
 * 2026). RLS's school_posts_member_update_unlisted policy allows this only
 * before a listing has already been requested.
 */
export async function requestPostListing(postId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_posts")
    .update({ listing_requested_at: new Date().toISOString(), listing_review: "pending" })
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
  created_at: string;
};

export async function listEventsForSchool(schoolId: string): Promise<PortalEvent[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_events")
    .select(
      "id, event_type, title, description, starts_at, ends_at, location, class_codes, registration_url, source_url, cancelled_at, slug, listing_requested_at, listing_review, created_at",
    )
    .eq("school_id", schoolId)
    .order("starts_at", { ascending: true });
  return (data as PortalEvent[] | null) ?? [];
}

/** Same listing-request gate as requestPostListing, for the school's own events. */
export async function requestEventListing(eventId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_events")
    .update({ listing_requested_at: new Date().toISOString(), listing_review: "pending" })
    .eq("id", eventId)
    .eq("school_id", schoolId);
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
  created_at: string;
};

export async function listJobsForSchool(schoolId: string): Promise<PortalJob[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_jobs")
    .select(
      "id, title, employment_type, subject, description, experience_required, salary_range, location, apply_url, apply_email, class_codes, closes_at, filled_at, cancelled_at, slug, listing_requested_at, listing_review, created_at",
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return (data as PortalJob[] | null) ?? [];
}

/** Same listing-request gate as requestPostListing/requestEventListing, for the school's own jobs. */
export async function requestJobListing(jobId: string, schoolId: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("school_jobs")
    .update({ listing_requested_at: new Date().toISOString(), listing_review: "pending" })
    .eq("id", jobId)
    .eq("school_id", schoolId);
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
