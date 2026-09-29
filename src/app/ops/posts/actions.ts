"use server";

import { redirect } from "next/navigation";
import { logAnalyticsEvent } from "@/lib/analytics";
import { requireStaff } from "@/lib/db/ops";

export async function approvePost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("school_posts")
    .update({
      review: "approved",
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    })
    .eq("id", postId);

  redirect("/ops/posts");
}

export async function rejectPost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("school_posts")
    .update({ review: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
    .eq("id", postId);

  redirect("/ops/posts");
}

/**
 * Approves a post for the site-wide /news aggregator — a separate gate from
 * `approvePost` above, which only ever controlled whether the post is live
 * on the SCHOOL'S OWN page (SEO/GEO follow-up, 29 Sep 2026). See
 * db/views/101_public_news.sql / api.public_news.
 */
export async function approvePostListing(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const { supabase, user } = await requireStaff();

  const { data: post } = await supabase
    .from("school_posts")
    .select("school_id")
    .eq("id", postId)
    .maybeSingle();

  await supabase
    .from("school_posts")
    .update({
      listing_review: "approved",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", postId);

  await logAnalyticsEvent({
    eventType: "listing_reviewed",
    entityType: "news",
    entityId: postId,
    schoolId: post?.school_id,
    metadata: { decision: "approved" },
  });

  redirect("/ops/posts");
}

/**
 * P1.5: requires a reason, carried on `rejection_reason` so the school sees
 * why on /portal/news and can fix it before resubmitting ("Request →
 * Rejected with reason → Edit → Resubmit"). The row itself stays freely
 * editable once rejected — see school_posts_enforce_edit_lock — so there is
 * no separate "unlock" step here.
 */
export async function rejectPostListing(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const { supabase, user } = await requireStaff();

  const { data: post } = await supabase
    .from("school_posts")
    .select("school_id")
    .eq("id", postId)
    .maybeSingle();

  await supabase
    .from("school_posts")
    .update({
      listing_review: "rejected",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", postId);

  await logAnalyticsEvent({
    eventType: "listing_reviewed",
    entityType: "news",
    entityId: postId,
    schoolId: post?.school_id,
    metadata: { decision: "rejected" },
  });

  redirect("/ops/posts");
}

/**
 * Grants a paid tier a school has requested (`requested_tier`) — the only
 * way `tier` can move off 'organic' (RLS blocks a school from setting it
 * itself). There's no billing integration here: ops does this once the
 * commercial side (selling the featured post / press release) is sorted out
 * elsewhere, per the SEO/GEO follow-up's own instruction not to invent a
 * payment system as part of this feature.
 */
export async function grantPostTier(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const tier = String(formData.get("tier") ?? "");
  if (tier !== "featured" && tier !== "press_release") redirect("/ops/posts");
  const { supabase } = await requireStaff();

  await supabase.from("school_posts").update({ tier, requested_tier: null }).eq("id", postId);

  redirect("/ops/posts");
}
