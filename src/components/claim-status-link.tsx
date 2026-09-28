"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/db/browser";

type ClaimState = "default" | "hidden" | "member" | "pending" | "rejected";

/**
 * Increment 4 (D): the "Claim it free" area on the public school entity page,
 * made claim/membership-aware without turning the page itself user-dependent.
 *
 * entity-page.tsx is statically rendered/ISR'd (see the [locale]/layout.tsx
 * comment on why isSignedIn was moved out of a server-side cookies() read
 * into AuthStatusLink) — a server-side session/membership check here would
 * force the whole page dynamic on every request. So, same pattern as
 * AuthStatusLink: resolve personalization client-side, after first paint.
 *
 * Query cost: only one instance of this component renders per page (the
 * entity page's own claim CTA — not reused in any listing/card), so this is
 * not a per-row/N+1 concern. For a signed-out visitor (the common case) it's
 * zero table queries — getSession() alone answers it. For a signed-in
 * visitor: at most a school_members lookup (equality on its composite PK,
 * index-only) and, only if not a member, a school_claims lookup (no index
 * beyond the primary key today, but the table has ~2 rows total — flagged in
 * the implementation log as a forward-looking note, not a blocker here; no
 * migration in this increment).
 */
export function ClaimStatusLink({ schoolId, isClaimed }: { schoolId: string; isClaimed: boolean }) {
  const [state, setState] = useState<ClaimState>(isClaimed ? "hidden" : "default");

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();

    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!userId || cancelled) return;

      const { data: membership } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("school_id", schoolId)
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (membership) {
        setState("member");
        return;
      }

      // Not a member — if the school is already claimed by someone else,
      // there's nothing for this visitor to do here (same as today's
      // behaviour for a non-member visiting a claimed school's page).
      if (isClaimed) return;

      const { data: claim } = await supabase
        .from("school_claims")
        .select("status")
        .eq("school_id", schoolId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (claim?.status === "pending") setState("pending");
      else if (claim?.status === "rejected") setState("rejected");
    });

    return () => {
      cancelled = true;
    };
  }, [schoolId, isClaimed]);

  if (state === "hidden") return null;

  const linkClassName = "font-semibold text-ruled-blue";

  switch (state) {
    case "member":
      return (
        <Link href="/portal" className={linkClassName}>
          Manage school
        </Link>
      );
    case "pending":
      return (
        <Link href={`/for-schools/claim/${schoolId}/pending`} className={linkClassName}>
          Claim pending
        </Link>
      );
    case "rejected":
      return (
        <Link href={`/for-schools/claim/${schoolId}`} className={linkClassName}>
          Claim again
        </Link>
      );
    default:
      return (
        <Link href={`/for-schools/claim/${schoolId}`} className={linkClassName}>
          Is this your school? Claim it free
        </Link>
      );
  }
}
