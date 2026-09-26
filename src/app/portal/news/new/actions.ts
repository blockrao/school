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
});

export async function submitSchoolPost(formData: FormData) {
  const notPath = "/portal/news/new";

  const parsed = postSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    body: formData.get("body"),
    sourceUrl: formData.get("sourceUrl") || "",
  });
  if (!parsed.success) {
    redirect(`${notPath}?error=invalid`);
  }

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);

  const { error } = await supabase.from("school_posts").insert({
    school_id: schoolId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    body: parsed.data.body,
    source_url: parsed.data.sourceUrl || null,
    created_by: user?.id,
    review: "pending",
  });

  if (error) {
    redirect(`${notPath}?error=submit_failed`);
  }

  redirect("/portal/news?post_submitted=1");
}
