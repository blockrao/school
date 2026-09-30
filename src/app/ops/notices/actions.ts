"use server";

import { redirect } from "next/navigation";
import { deriveAdmissionStatus } from "@/lib/admission-notice-review";
import { requireStaff } from "@/lib/db/ops";

/**
 * Closes the gap flagged 30 Sep 2026: approving a notice used to only flip
 * `admission_notices.review` — nothing ever reached `admission_cycles`, so
 * the public page never changed. This is the per-cycle counterpart to
 * `approveNotice` below: one call per proposed cycle the ops review page
 * showed (src/lib/admission-notice-review.ts builds those proposals from
 * the notice's `extraction`), submitted only after staff has confirmed —
 * never silently inferred — the `class_code` and academic year, since a
 * wrong class_code here would misfile a real admission cycle under the
 * wrong grade on a live page.
 *
 * Upserts on the same `(school_id, academic_year, class_code)` unique
 * constraint the table already has (baseline migration), so re-applying an
 * already-published cycle (e.g. a later, corrected notice for the same
 * class/year) safely updates it in place rather than creating a duplicate.
 * `status` is derived fresh from the confirmed dates via
 * `deriveAdmissionStatus` unless staff picked an explicit override
 * (postponed/cancelled/results_out — states no date range implies on its
 * own). Also marks the source notice `approved`, same as `approveNotice`.
 */
export async function applyNoticeCycle(formData: FormData) {
  const noticeId = String(formData.get("noticeId") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const noticeUrl = String(formData.get("noticeUrl") ?? "");
  const classCode = String(formData.get("classCode") ?? "").trim();
  const academicYear = String(formData.get("academicYear") ?? "").trim();
  const sourceType =
    formData.get("sourceType") === "school_reported" ? "school_reported" : "official";
  const statusOverride = String(formData.get("statusOverride") ?? "auto");
  const opensOn = String(formData.get("opensOn") ?? "").trim() || null;
  const closesOn = String(formData.get("closesOn") ?? "").trim() || null;
  const resultsOn = String(formData.get("resultsOn") ?? "").trim() || null;
  const dobFrom = String(formData.get("dobFrom") ?? "").trim() || null;
  const dobTo = String(formData.get("dobTo") ?? "").trim() || null;
  const formModeRaw = String(formData.get("formMode") ?? "unknown");
  const formMode = (["online", "offline", "both", "unknown"] as const).includes(
    formModeRaw as "online" | "offline" | "both" | "unknown",
  )
    ? (formModeRaw as "online" | "offline" | "both" | "unknown")
    : "unknown";
  const formUrl = String(formData.get("formUrl") ?? "").trim() || null;
  const registrationFeeRaw = String(formData.get("registrationFee") ?? "").trim();
  const registrationFee = registrationFeeRaw === "" ? null : Number(registrationFeeRaw);
  const classLabelAmbiguous = formData.get("classLabelAmbiguous") === "1";
  const classLabelNote = String(formData.get("classLabelNote") ?? "").trim() || null;
  const selectionNotes = String(formData.get("selectionNotes") ?? "").trim() || null;
  const documentsRequiredRaw = String(formData.get("documentsRequired") ?? "").trim();
  const documentsRequired =
    documentsRequiredRaw === ""
      ? null
      : documentsRequiredRaw
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);

  const { supabase, user } = await requireStaff();

  if (!schoolId || !classCode || !academicYear) {
    // No class picked, or no year — nothing safe to publish. Send staff back
    // to the same notice rather than silently no-op'ing.
    redirect(`/ops/notices?error=missing_fields#notice-${noticeId}`);
  }

  const status =
    statusOverride === "auto"
      ? deriveAdmissionStatus(opensOn, closesOn, new Date())
      : (statusOverride as "postponed" | "cancelled" | "results_out");

  const { error } = await supabase.from("admission_cycles").upsert(
    {
      school_id: schoolId,
      academic_year: academicYear,
      class_code: classCode,
      notice_url: noticeUrl || null,
      source_type: sourceType,
      verification: "ops_verified",
      // verification_status ("v2", unknown|pending|verified|conflicting) is a
      // separate NOT NULL column nothing else in the app reads yet, but the DB
      // still requires a value on insert. Matched to the pairing every real
      // `ops_verified` row already uses (checked live: 12/12 are "verified").
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: user.id,
      status,
      opens_on: opensOn,
      closes_on: closesOn,
      results_on: resultsOn,
      dob_from: dobFrom,
      dob_to: dobTo,
      form_mode: formMode,
      form_url: formUrl,
      registration_fee:
        registrationFee != null && Number.isFinite(registrationFee) ? registrationFee : null,
      class_label_ambiguous: classLabelAmbiguous,
      class_label_note: classLabelNote,
      selection_notes: selectionNotes,
      documents_required: documentsRequired,
    },
    { onConflict: "school_id,academic_year,class_code" },
  );

  if (!error && noticeId) {
    await supabase
      .from("admission_notices")
      .update({ review: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", noticeId);
  }

  redirect(
    error ? `/ops/notices?error=publish_failed#notice-${noticeId}` : "/ops/notices?published=1",
  );
}

export async function approveNotice(formData: FormData) {
  const noticeId = String(formData.get("noticeId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("admission_notices")
    .update({ review: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
    .eq("id", noticeId);

  redirect("/ops/notices");
}

export async function rejectNotice(formData: FormData) {
  const noticeId = String(formData.get("noticeId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("admission_notices")
    .update({ review: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
    .eq("id", noticeId);

  redirect("/ops/notices");
}
