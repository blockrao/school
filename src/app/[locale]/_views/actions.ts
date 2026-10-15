"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { logAnalyticsEvent } from "@/lib/analytics";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { notifySchoolOfLead } from "@/lib/notify/lead-email";
import { notifyOpenEnquiry } from "@/lib/notify/open-enquiry";
import { normalizeIndianPhone } from "@/lib/phone";
import { checkRateLimit } from "@/lib/rate-limit";
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

  after(() => notifySchoolOfLead(parsed.data.schoolId, "enquiry"));
  redirect(`${returnPath}?enquiry_sent=1#enquiry-heading`);
}

const openEnquirySchema = z.object({
  schoolId: z.string().min(1),
  returnPath: z.string().regex(/^\/(?!\/)/),
  parentName: z.string().trim().min(1).max(120),
  email: z.string().trim().max(254).optional(),
  phone: z.string().trim().max(20).optional(),
  classCode: z.string().max(10).optional(),
  message: z.string().trim().min(1).max(1000),
  consent: z.literal("on"),
});

/**
 * "Ask this school" without signing in (owner decision 15 Oct 2026): name,
 * phone or email, a question, and explicit consent to share the contact with
 * this school. Spam control: hidden honeypot field plus a per-email/phone and
 * per-IP rate limit. Saved to open_enquiries, then emailed to the school.
 */
export async function sendOpenEnquiry(formData: FormData) {
  const rawReturnPath = String(formData.get("returnPath") ?? "");
  const returnPath = /^\/(?!\/)/.test(rawReturnPath) ? rawReturnPath : "/";
  const fail = (code: string) => redirect(`${returnPath}?ask_error=${code}#enquiry-heading`);

  // Honeypot: real people never fill this hidden field. Pretend success.
  if (String(formData.get("website") ?? "").length > 0) {
    redirect(`${returnPath}?enquiry_sent=1#enquiry-heading`);
  }

  const classCode = formData.get("classCode");
  const parsed = openEnquirySchema.safeParse({
    schoolId: formData.get("schoolId"),
    returnPath,
    parentName: formData.get("parentName"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    classCode: typeof classCode === "string" && classCode.length > 0 ? classCode : undefined,
    message: formData.get("message"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    const consentMissing = parsed.error.issues.some((i) => i.path[0] === "consent");
    fail(consentMissing ? "consent" : "invalid");
    return;
  }

  const email = parsed.data.email?.toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail("contact");
    return;
  }
  const phone = parsed.data.phone ? normalizeIndianPhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) {
    fail("contact");
    return;
  }
  if (!email && !phone) {
    fail("contact");
    return;
  }

  const allowed = await checkRateLimit("open_enquiry", email ?? phone ?? "unknown", 3, 60 * 60);
  if (!allowed) {
    fail("rate");
    return;
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.from("open_enquiries").insert({
    school_id: parsed.data.schoolId,
    parent_name: parsed.data.parentName,
    contact_email: email ?? null,
    contact_phone: phone,
    class_code: parsed.data.classCode ?? null,
    message: parsed.data.message,
    consent_shared: true,
  });
  if (error) {
    fail("failed");
    return;
  }

  after(() =>
    notifyOpenEnquiry(parsed.data.schoolId, null, {
      parentName: parsed.data.parentName,
      email: email ?? null,
      phone,
      classLabel: parsed.data.classCode ? `Class ${parsed.data.classCode.replace(/^c/, "")}` : null,
      message: parsed.data.message,
    }),
  );
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

  await logAnalyticsEvent({
    eventType: "admission_lead_submit",
    entityType: "admission_cycle",
    entityId: cycleId,
    schoolId: parsed.data.schoolId,
  });

  after(() => notifySchoolOfLead(parsed.data.schoolId, "admission_lead"));
  redirect(`${returnPath}?apply_sent=1#apply-heading`);
}
