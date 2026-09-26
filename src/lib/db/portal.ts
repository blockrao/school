import "server-only";
import { createSessionClient } from "@/lib/db/session";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  created_at: string;
};

export async function listPostsForSchool(schoolId: string): Promise<PortalPost[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("school_posts")
    .select("id, kind, title, body, source_url, review, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return (data as PortalPost[] | null) ?? [];
}
