import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient, getSessionUser, type SessionUser } from "@/lib/db/session";

type StaffGuardResult = {
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
  user: SessionUser;
};

/**
 * Redirects home if not signed in or not staff. Returns the authenticated
 * Supabase client plus the verified user — callers that need the user's id
 * (e.g. to stamp `reviewed_by`) read it off this result instead of calling
 * getSessionUser() again, which would just re-verify the same JWT a second
 * time for no reason.
 */
export async function requireStaff(locale = "en"): Promise<StaffGuardResult> {
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect(`/${locale}/sign-in?next=%2Fops`);

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect(`/${locale}`);

  return { supabase, user };
}

/**
 * Redirects to /ops if signed in as staff but not `admin` — for actions that
 * change who else has staff access (role changes, staff removal). `ops` can
 * see /ops/staff, only `admin` can mutate it.
 */
export async function requireAdmin(locale = "en"): Promise<StaffGuardResult> {
  const { supabase, user } = await requireStaff(locale);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/ops");

  return { supabase, user };
}
