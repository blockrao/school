"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelJob, getMySchoolId, markJobFilled, requestJobListing } from "@/lib/db/portal";

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
