"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { LOCALES, lp } from "@/lib/urls";

const enquirySchema = z.object({
  schoolId: z.string().min(1),
  // Same-site path only (never an absolute or protocol-relative URL).
  returnPath: z.string().regex(/^\/(?!\/)/),
  classCode: z.string().optional(),
  message: z.string().trim().min(1).max(1000),
});

export async function sendEnquiry(formData: FormData) {
  const rawReturnPath = String(formData.get("returnPath") ?? "");
  const returnPath = /^\/(?!\/)/.test(rawReturnPath) ? rawReturnPath : "/";

  const classCode = formData.get("classCode");
  const parsed = enquirySchema.safeParse({
    schoolId: formData.get("schoolId"),
    returnPath,
    classCode: typeof classCode === "string" && classCode.length > 0 ? classCode : undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    redirect(`${returnPath}?enquiry_error=invalid#enquiry-heading`);
  }

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    const first = returnPath.split("/")[1];
    const locale = (LOCALES as readonly string[]).includes(first) ? first : "en";
    redirect(lp(locale, `/sign-in?next=${encodeURIComponent(`${returnPath}#enquiry-heading`)}`));
  }

  const { error } = await supabase.from("enquiries").insert({
    school_id: parsed.data.schoolId,
    user_id: user.id,
    class_code: parsed.data.classCode ?? null,
    message: parsed.data.message,
  });

  if (error) {
    redirect(`${returnPath}?enquiry_error=failed#enquiry-heading`);
  }

  redirect(`${returnPath}?enquiry_sent=1#enquiry-heading`);
}

const admissionLeadSchema = z.object({
  schoolId: z.string().min(1),
  // Encodes "{cycle_id}|{class_code}|{academic_year}" — a single <select> in
  // the UI picks one of the school's actual admission_cycles rows, so this
  // avoids needing three separate hidden inputs kept in sync with whichever
  // <option> was chosen.
  cycleSelection: z.string().regex(/^[^|]+\|[^|]+\|[^|]+$/),
  // Same-site path only (never an absolute or protocol-relative URL).
  returnPath: z.string().regex(/^\/(?!\/)/),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  consent: z.literal("on"),
});

/**
 * Admission-leads CTA (29 Sep 2026): replaces the old raw "Application form ↗"
 * link-out with a captured, verified lead handed to the school. "Verified"
 * here means the same thing it already means everywhere else on the parent
 * side of this app — a phone-OTP-authenticated session (getSessionUser) — not
 * a new verification mechanism. Unlike sendEnquiry above (SDP-04's
 * controlled-intermediary model, which never discloses the parent's contact
 * details to the school), applying is a deliberate, single-recipient act: the
 * consent checkbox is what makes disclosing name+phone to *this one school*
 * legitimate, so it's required and checked here, not inferred.
 */
export async function submitAdmissionLead(formData: FormData) {
  const rawReturnPath = String(formData.get("returnPath") ?? "");
  const returnPath = /^\/(?!\/)/.test(rawReturnPath) ? rawReturnPath : "/";

  const note = formData.get("note");
  const parsed = admissionLeadSchema.safeParse({
    schoolId: formData.get("schoolId"),
    cycleSelection: formData.get("cycleSelection"),
    returnPath,
    note: typeof note === "string" ? note : "",
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    const code = parsed.error.issues.some((i) => i.path[0] === "consent")
      ? "consent_required"
      : "invalid";
    redirect(`${returnPath}?apply_error=${code}#apply-heading`);
  }

  const [cycleId, classCode, academicYear] = parsed.data.cycleSelection.split("|");

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    const first = returnPath.split("/")[1];
    const locale = (LOCALES as readonly string[]).includes(first) ? first : "en";
    redirect(lp(locale, `/sign-in?next=${encodeURIComponent(`${returnPath}#apply-heading`)}`));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("admission_leads").insert({
    school_id: parsed.data.schoolId,
    admission_cycle_id: cycleId,
    class_code: classCode,
    academic_year: academicYear,
    user_id: user.id,
    full_name: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    note: parsed.data.note || null,
  });

  if (error) {
    // 23505 = unique_violation on admission_leads_cycle_user_unique — the
    // parent already applied for this exact class/session; that's not a
    // failure worth a generic error, it's a distinct, friendlier state.
    const code = error.code === "23505" ? "already_applied" : "failed";
    redirect(`${returnPath}?apply_error=${code}#apply-heading`);
  }

  redirect(`${returnPath}?apply_sent=1#apply-heading`);
}
