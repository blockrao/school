import "server-only";
import type { createSessionClient } from "@/lib/db/session";
import { localePrefix } from "@/lib/urls";

/**
 * True once the user has a name on file and has accepted the current
 * terms/privacy notice (an unwithdrawn `consents` row, purpose='account').
 * Both are required — a user could in principle get a `profiles` row without
 * ever completing onboarding (the sign-in flow's own upsert only sets
 * `user_id`), so this checks the real completion signals, not just row
 * existence.
 */
export async function needsOnboarding(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  userId: string,
): Promise<boolean> {
  const [{ data: profile }, { data: consent }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
    supabase
      .from("consents")
      .select("id")
      .eq("user_id", userId)
      .eq("purpose", "account")
      .is("withdrawn_at", null)
      .limit(1)
      .maybeSingle(),
  ]);
  return !profile?.full_name || !consent;
}

/** Where to send the user right after sign-in — onboarding first if incomplete, else `next`. */
export function postSignInPath(pendingOnboarding: boolean, locale: string, next: string): string {
  return pendingOnboarding
    ? `${localePrefix(locale)}/onboarding?next=${encodeURIComponent(next)}`
    : next;
}
