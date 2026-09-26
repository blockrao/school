import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/db/session";

/** Redirects home if not signed in or not staff. Returns the authenticated Supabase client for reuse. */
export async function requireStaff(locale = "en") {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in?next=%2Fops`);

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect(`/${locale}`);

  return supabase;
}

/**
 * Redirects to /ops if signed in as staff but not `admin` — for actions that
 * change who else has staff access (role changes, staff removal). `ops` can
 * see /ops/staff, only `admin` can mutate it.
 */
export async function requireAdmin(locale = "en") {
  const supabase = await requireStaff(locale);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user?.id ?? "")
    .single();

  if (profile?.role !== "admin") redirect("/ops");

  return supabase;
}
