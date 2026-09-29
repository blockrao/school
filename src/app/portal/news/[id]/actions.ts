"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMySchoolId, requestPostListing } from "@/lib/db/portal";

/**
 * Separate from publishing to the school's own page: this asks ops to
 * feature the post on the site-wide /news aggregator (SEO/GEO follow-up,
 * 29 Sep 2026). See db/views/101_public_news.sql / api.public_news, which
 * only shows listing_review = 'approved' rows.
 */
export async function requestNewsListing(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !postId) redirect("/portal/news");

  await requestPostListing(postId, schoolId);
  revalidatePath("/portal/news");
  redirect("/portal/news?listing_requested=1");
}
