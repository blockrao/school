"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMySchoolId } from "@/lib/db/portal";
import { createSessionClient } from "@/lib/db/session";

const noticeSchema = z.object({
  url: z.string().url(),
  session: z.string().trim().min(1),
  classes: z.string().trim().min(1),
  formType: z.enum(["online", "offline", "both"]),
  opensOn: z.string().optional(),
  closesOn: z.string().optional(),
  registrationFee: z.string().optional(),
});

export async function submitAdmissionNotice(formData: FormData) {
  const notPath = "/portal/notices/new";

  const parsed = noticeSchema.safeParse({
    url: formData.get("url"),
    session: formData.get("session"),
    classes: formData.get("classes"),
    formType: formData.get("formType"),
    opensOn: formData.get("opensOn") || undefined,
    closesOn: formData.get("closesOn") || undefined,
    registrationFee: formData.get("registrationFee") || undefined,
  });
  if (!parsed.success) {
    redirect(`${notPath}?error=invalid`);
  }

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const supabase = await createSessionClient();
  const contentHash = createHash("sha256")
    .update(parsed.data.url)
    .update(Date.now().toString())
    .digest("hex");

  const { error } = await supabase.from("admission_notices").insert({
    school_id: schoolId,
    url: parsed.data.url,
    content_hash: contentHash,
    extraction: {
      session: parsed.data.session,
      classes: parsed.data.classes,
      form_type: parsed.data.formType,
      opens_on: parsed.data.opensOn ?? null,
      closes_on: parsed.data.closesOn ?? null,
      registration_fee: parsed.data.registrationFee ?? null,
    },
    review: "pending",
  });

  if (error) {
    redirect(`${notPath}?error=submit_failed`);
  }

  redirect("/portal?notice_submitted=1");
}
