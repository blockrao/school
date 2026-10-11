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

const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:");

const updatePostSchema = z
  .object({
    topic: z.enum(["general", "admission_announcement"]),
    academicYear: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    classCodes: z.array(z.string().trim().min(1).max(30)).max(30).optional(),
    opensOn: z.string().date().optional().or(z.literal("")),
    closesOn: z.string().date().optional().or(z.literal("")),
    applicationUrl: httpsUrl.optional().or(z.literal("")),
    noticeUrl: httpsUrl.optional().or(z.literal("")),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
    sourceUrl: z.string().url().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (
      value.topic === "admission_announcement" &&
      value.opensOn &&
      value.closesOn &&
      value.closesOn < value.opensOn
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["closesOn"],
        message: "Closing date must not precede opening date.",
      });
    }
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
    topic: formData.get("topic") || "general",
    academicYear: formData.get("academicYear") || "",
    classCodes: formData
      .getAll("classCodes")
      .filter((v): v is string => typeof v === "string" && v.length > 0),
    opensOn: formData.get("opensOn") || "",
    closesOn: formData.get("closesOn") || "",
    applicationUrl: formData.get("applicationUrl") || "",
    noticeUrl: formData.get("noticeUrl") || "",
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
    topic: parsed.data.topic,
    academicYear:
      parsed.data.topic === "admission_announcement" ? parsed.data.academicYear || null : null,
    classCodes:
      parsed.data.topic === "admission_announcement" ? (parsed.data.classCodes ?? []) : [],
    opensOn: parsed.data.topic === "admission_announcement" ? parsed.data.opensOn || null : null,
    closesOn: parsed.data.topic === "admission_announcement" ? parsed.data.closesOn || null : null,
    applicationUrl:
      parsed.data.topic === "admission_announcement" ? parsed.data.applicationUrl || null : null,
    noticeUrl:
      parsed.data.topic === "admission_announcement" ? parsed.data.noticeUrl || null : null,
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
