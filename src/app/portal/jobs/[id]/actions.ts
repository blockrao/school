"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelJob,
  getMySchoolId,
  markJobFilled,
  requestJobListing,
  updateJob,
} from "@/lib/db/portal";

const updateJobSchema = z
  .object({
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
  .refine((v) => v.applyUrl || v.applyEmail, { message: "no_apply_contact" });

/** P1.4: restore edit capability — see updateSchoolPost's comment (same edit-lock rule, this table's trigger). */
export async function updateJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !jobId) redirect("/portal/jobs");

  const parsed = updateJobSchema.safeParse({
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
    const code = parsed.error.issues.some((i) => i.message === "no_apply_contact")
      ? "no_apply_contact"
      : "invalid";
    redirect(`/portal/jobs/${jobId}?error=${code}`);
  }

  const ok = await updateJob(jobId, schoolId, {
    title: parsed.data.title,
    subject: parsed.data.subject || null,
    description: parsed.data.description,
    experienceRequired: parsed.data.experienceRequired || null,
    salaryRange: parsed.data.salaryRange || null,
    location: parsed.data.location || null,
    applyUrl: parsed.data.applyUrl || null,
    applyEmail: parsed.data.applyEmail || null,
    closesAt: parsed.data.closesAt ? new Date(parsed.data.closesAt).toISOString() : null,
  });
  if (!ok) {
    redirect(`/portal/jobs/${jobId}?error=locked`);
  }

  revalidatePath("/portal/jobs");
  redirect("/portal/jobs?job_updated=1");
}

export async function requestJobListingAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !jobId) redirect("/portal/jobs");

  await requestJobListing(jobId, schoolId);
  revalidatePath("/portal/jobs");
  redirect("/portal/jobs?listing_requested=1");
}

export async function markJobFilledAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !jobId) redirect("/portal/jobs");

  await markJobFilled(jobId, schoolId);
  revalidatePath("/portal/jobs");
  redirect("/portal/jobs?job_filled=1");
}

export async function cancelJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !jobId) redirect("/portal/jobs");

  await cancelJob(jobId, schoolId);
  revalidatePath("/portal/jobs");
  redirect("/portal/jobs?job_cancelled=1");
}
