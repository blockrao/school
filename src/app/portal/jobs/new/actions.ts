"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getMySchoolId } from "@/lib/db/portal";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "visiting"] as const;

const jobSchema = z
  .object({
    employmentType: z.enum(EMPLOYMENT_TYPES),
    title: z.string().trim().min(1).max(200),
    subject: z.string().trim().max(100).optional().or(z.literal("")),
    description: z.string().trim().min(1).max(5000),
    experienceRequired: z.string().trim().max(200).optional().or(z.literal("")),
    salaryRange: z.string().trim().max(100).optional().or(z.literal("")),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    applyUrl: z.string().url().optional().or(z.literal("")),
    applyEmail: z.string().email().optional().or(z.literal("")),
    closesAt: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.applyUrl || data.applyEmail, {
    message: "Provide an apply link or an apply email.",
    path: ["applyUrl"],
  });

export async function submitSchoolJob(formData: FormData) {
  const notPath = "/portal/jobs/new";

  const parsed = jobSchema.safeParse({
    employmentType: formData.get("employmentType"),
    title: formData.get("title"),
    subject: formData.get("subject") || "",
    description: formData.get("description"),
    experienceRequired: formData.get("experienceRequired") || "",
    salaryRange: formData.get("salaryRange") || "",
    location: formData.get("location") || "",
    applyUrl: formData.get("applyUrl") || "",
    applyEmail: formData.get("applyEmail") || "",
    closesAt: formData.get("closesAt") || "",
  });
  if (!parsed.success) {
    const code = parsed.error.issues.some((i) => i.path[0] === "applyUrl")
      ? "no_apply_contact"
      : "invalid";
    redirect(`${notPath}?error=${code}`);
  }

  let closesAtIso: string | null = null;
  if (parsed.data.closesAt) {
    const closesAtDate = new Date(parsed.data.closesAt);
    if (Number.isNaN(closesAtDate.getTime())) {
      redirect(`${notPath}?error=invalid`);
    }
    closesAtIso = closesAtDate.toISOString();
  }

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);

  // Same immediate-own-page-visibility model as events/news (29 Sep 2026):
  // no ops gate here at all, only for the /jobs listing request.
  const { error } = await supabase.from("school_jobs").insert({
    school_id: schoolId,
    employment_type: parsed.data.employmentType,
    title: parsed.data.title,
    subject: parsed.data.subject || null,
    description: parsed.data.description,
    experience_required: parsed.data.experienceRequired || null,
    salary_range: parsed.data.salaryRange || null,
    location: parsed.data.location || null,
    apply_url: parsed.data.applyUrl || null,
    apply_email: parsed.data.applyEmail || null,
    closes_at: closesAtIso,
    created_by: user?.id,
  });

  if (error) {
    redirect(`${notPath}?error=submit_failed`);
  }

  redirect("/portal/jobs?job_created=1");
}
