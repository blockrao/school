"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMySchoolId, requestPostListing, updatePost, withdrawPost } from "@/lib/db/portal";

/**
 * Separate from publishing to the school's own page: this asks ops to
 * feature the post on the site-wide /news aggregator (SEO/GEO follow-up,
 * 29 Sep 2026). See db/views/101_public_news.sql / api.public_news, which
 * only shows listing_review = 'approved' rows. Also the resubmit action for
 * a rejected post — see requestPostListing's comment (P0.1/P1.5).
 */
export async function requestNewsListing(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !postId) redirect("/portal/news");

  await requestPostListing(postId, schoolId);
  revalidatePath("/portal/news");
  redirect("/portal/news?listing_requested=1");
}

export async function withdrawNewsPost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !postId) redirect("/portal/news");

  await withdrawPost(postId, schoolId);
  revalidatePath("/portal/news");
  redirect("/portal/news?post_withdrawn=1");
}

const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  sourceUrl: z.string().url().optional().or(z.literal("")),
});

/**
 * P1.4: restore edit capability. Content edits are policed server-side by
 * school_posts_enforce_edit_lock (20260929090000_activity_admissions_v1.sql)
 * — blocked while listing_review = 'pending', and demoting an
 * approved+listed post to 'edited' on success — this action just surfaces
 * the outcome, it doesn't re-implement the rule.
 */
export async function updateSchoolPost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !postId) redirect("/portal/news");

  const parsed = updatePostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    sourceUrl: formData.get("sourceUrl") || "",
  });
  if (!parsed.success) {
    redirect(`/portal/news/${postId}?error=invalid`);
  }

  const ok = await updatePost(postId, schoolId, {
    title: parsed.data.title,
    body: parsed.data.body,
    sourceUrl: parsed.data.sourceUrl || null,
  });
  if (!ok) {
    // Most likely cause: listing_review = 'pending' (edit-locked while ops
    // reviews the currently-requested version) — the trigger's error
    // message names the exact reason, but that detail lives in Postgres
    // logs, not something to parse out of a PostgREST error here.
    redirect(`/portal/news/${postId}?error=locked`);
  }

  revalidatePath("/portal/news");
  redirect("/portal/news?post_updated=1");
}
