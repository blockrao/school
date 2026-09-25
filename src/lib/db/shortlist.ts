import "server-only";
import { createSessionClient } from "@/lib/db/session";

/** Empty set for an anonymous visitor — no query needed, Save always renders unsaved. */
export async function getShortlistedSchoolIds(schoolIds: string[]): Promise<Set<string>> {
  if (schoolIds.length === 0) return new Set();

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("shortlists")
    .select("school_id")
    .eq("user_id", user.id)
    .in("school_id", schoolIds);

  return new Set((data ?? []).map((row) => row.school_id));
}
