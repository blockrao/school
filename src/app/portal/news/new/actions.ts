"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getMySchoolId } from "@/lib/db/portal";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

const postSchema = z.object({
  kind: z.enum(["news", "press"]),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  requestedTier: z.enum(["organic", "featured", "press_release"]).optional(),
});

export async function submitSchoolPost(formData: FormData) {
  const notPath = "/portal/news/new";

  const parsed = postSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    body: formData.get("body"),
    sourceUrl: formData.get("sourceUrl") || "",
    requestedTier: formData.get("requestedTier") || "organic",
  });
  if (!parsed.success) {
    redirect(`${notPath}?error=invalid`);
  }

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);

  // SEO/GEO follow-up (29 Sep 2026): an organic post goes live on the
  // school's OWN page immediately — no ops pre-review for that tier of
  // visibility, `review: "approved"` is set right here rather than left
  // "pending". `tier` itself always stays 'organic' at insert (RLS enforces
  // this — school_posts_member_insert requires tier = 'organic'); a school
  // can only ever *request* featured/press_release via `requested_tier`,
  // never grant it to itself. Publish-to-site-wide-/news is a separate,
  // later step (see requestPostListing) which does still need ops review.
  const { error } = await supabase.from("school_posts").insert({
    school_id: schoolId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    body: parsed.data.body,
    source_url: parsed.data.sourceUrl || null,
    created_by: user?.id,
    review: "approved",
    published_at: new Date().toISOString(),
    requested_tier:
      parsed.data.requestedTier && parsed.data.requestedTier !== "organic"
        ? parsed.data.requestedTier
        : null,
  });

  if (error) {
    redirect(`${notPath}?error=submit_failed`);
  }

  redirect("/portal/news?post_submitted=1");
}
