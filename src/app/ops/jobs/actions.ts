"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";

/** Gates a job into the site-wide /jobs aggregator — see db/views/105_public_jobs.sql. */
export async function approveJobListing(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("school_jobs")
    .update({
      listing_review: "approved",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  redirect("/ops/jobs");
}

export async function rejectJobListing(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("school_jobs")
    .update({
      listing_review: "rejected",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  redirect("/ops/jobs");
}
