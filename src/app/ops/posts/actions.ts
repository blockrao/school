"use server";

import { redirect } from "next/navigation";
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

  await supabase
    .from("school_posts")
    .update({
      listing_review: "approved",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
    })
    .eq("id", postId);

  redirect("/ops/posts");
}

export async function rejectPostListing(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("school_posts")
    .update({
      listing_review: "rejected",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
    })
    .eq("id", postId);

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
