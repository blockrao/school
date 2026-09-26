import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/db/session";

export type SchoolMembership = {
  schoolId: string;
  role: "admin" | "staff";
};

/**
 * Redirects to /for-schools if not signed in or not a member of any school
 * (same funnel portal/page.tsx already used via getMySchoolId(), now made
 * explicit so every /portal entry point gates the same way — see
 * middleware.ts for why /portal itself isn't gated there). Returns the
 * authenticated client plus which school and role, for reuse.
 *
 * A user who is a member of more than one school gets the first one
 * (school_members has no "primary school" concept yet — same limitation
 * getMySchoolId() already had).
 */
export async function requireSchoolMember(): Promise<{
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
  membership: SchoolMembership;
}> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/for-schools");

  const { data } = await supabase
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!data) redirect("/for-schools");

  return { supabase, membership: { schoolId: data.school_id, role: data.role } };
}

/**
 * Same as requireSchoolMember(), but only a school's own 'admin' member (or
 * platform staff) may proceed — a 'staff' member is bounced back to /portal.
 * Use this for anything beyond day-to-day reporting: nothing in the app uses
 * it yet (school_members.role is new — every existing row is 'admin'), but
 * it's here so the next school-admin-only feature (managing other members,
 * say) has a ready-made, consistent guard instead of a bespoke check.
 */
export async function requireSchoolAdmin(): Promise<{
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
  membership: SchoolMembership;
}> {
  const { supabase, membership } = await requireSchoolMember();
  if (membership.role !== "admin") redirect("/portal");
  return { supabase, membership };
}
