"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/db/session";

const enquirySchema = z.object({
  schoolId: z.string().min(1),
  idSlug: z.string().min(1),
  locale: z.string().min(1),
  classCode: z.string().optional(),
  message: z.string().trim().min(1).max(1000),
});

export async function sendEnquiry(formData: FormData) {
  const idSlug = String(formData.get("idSlug") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const schoolPath = `/${locale}/school/${idSlug}`;

  const classCode = formData.get("classCode");
  const parsed = enquirySchema.safeParse({
    schoolId: formData.get("schoolId"),
    idSlug,
    locale,
    classCode: typeof classCode === "string" && classCode.length > 0 ? classCode : undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    redirect(`${schoolPath}?enquiry_error=invalid#enquiry-heading`);
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`${schoolPath}#enquiry-heading`)}`);
  }

  const { error } = await supabase.from("enquiries").insert({
    school_id: parsed.data.schoolId,
    user_id: user.id,
    class_code: parsed.data.classCode ?? null,
    message: parsed.data.message,
  });

  if (error) {
    redirect(`${schoolPath}?enquiry_error=failed#enquiry-heading`);
  }

  redirect(`${schoolPath}?enquiry_sent=1#enquiry-heading`);
}
