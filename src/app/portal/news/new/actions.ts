"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getMySchoolId } from "@/lib/db/portal";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:");

const postSchema = z.object({
  kind: z.enum(["news", "press"]),
  topic: z.enum(["general", "admission_announcement"]),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/).optional().or(z.literal("")),
  classCodes: z.array(z.string().trim().min(1).max(30)).max(30).optional(),
  opensOn: z.string().date().optional().or(z.literal("")),
  closesOn: z.string().date().optional().or(z.literal("")),
  applicationUrl: httpsUrl.optional().or(z.literal("")),
  noticeUrl: httpsUrl.optional().or(z.literal("")),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  requestedTier: z.enum(["organic", "featured", "press_release"]).optional(),
}).superRefine((value, ctx) => {
  if (value.topic !== "admission_announcement") return;
  if (value.opensOn && value.closesOn && value.closesOn < value.opensOn) {
    ctx.addIssue({ code: "custom", path: ["closesOn"], message: "Closing date must not precede opening date." });
  }
});

export async function submitSchoolPost(formData: FormData) {
  const notPath = "/portal/news/new";

  const parsed = postSchema.safeParse({
    kind: formData.get("kind"),
    topic: formData.get("topic") || "general",
    academicYear: formData.get("academicYear") || "",
    classCodes: formData.getAll("classCodes").filter((v): v is string => typeof v === "string" && v.length > 0),
    opensOn: formData.get("opensOn") || "",
    closesOn: formData.get("closesOn") || "",
    applicationUrl: formData.get("applicationUrl") || "",
    noticeUrl: formData.get("noticeUrl") || "",
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
    topic: parsed.data.topic,
    admission_academic_year: parsed.data.topic === "admission_announcement" ? parsed.data.academicYear || null : null,
    admission_class_codes: parsed.data.topic === "admission_announcement" ? parsed.data.classCodes ?? [] : [],
    admission_opens_on: parsed.data.topic === "admission_announcement" ? parsed.data.opensOn || null : null,
    admission_closes_on: parsed.data.topic === "admission_announcement" ? parsed.data.closesOn || null : null,
    admission_application_url: parsed.data.topic === "admission_announcement" ? parsed.data.applicationUrl || null : null,
    admission_notice_url: parsed.data.topic === "admission_announcement" ? parsed.data.noticeUrl || null : null,
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
