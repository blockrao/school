"use server";

import { redirect } from "next/navigation";
import { logAnalyticsEvent } from "@/lib/analytics";
import { requireStaff } from "@/lib/db/ops";

/** Gates a job into the site-wide /jobs aggregator — see db/views/105_public_jobs.sql. */
export async function approveJobListing(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const { supabase, user } = await requireStaff();

  const { data: job } = await supabase
    .from("school_jobs")
    .select("school_id")
    .eq("id", jobId)
    .maybeSingle();

  await supabase
    .from("school_jobs")
    .update({
      listing_review: "approved",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", jobId);

  await logAnalyticsEvent({
    eventType: "listing_reviewed",
    entityType: "job",
    entityId: jobId,
    schoolId: job?.school_id,
    metadata: { decision: "approved" },
  });

  redirect("/ops/jobs");
}

/** P1.5: requires a reason — see rejectPostListing's comment (same pattern, this table). */
export async function rejectJobListing(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const { supabase, user } = await requireStaff();

  const { data: job } = await supabase
    .from("school_jobs")
    .select("school_id")
    .eq("id", jobId)
    .maybeSingle();

  await supabase
    .from("school_jobs")
    .update({
      listing_review: "rejected",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", jobId);

  await logAnalyticsEvent({
    eventType: "listing_reviewed",
    entityType: "job",
    entityId: jobId,
    schoolId: job?.school_id,
    metadata: { decision: "rejected" },
  });

  redirect("/ops/jobs");
}
