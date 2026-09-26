"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/db/session";

const enquirySchema = z.object({
  schoolId: z.string().min(1),
  returnPath: z.string().min(1),
  classCode: z.string().optional(),
  message: z.string().trim().min(1).max(1000),
});

export async function sendEnquiry(formData: FormData) {
  const returnPath = String(formData.get("returnPath") ?? "");

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const locale = returnPath.split("/")[1] || "en";
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`${returnPath}#enquiry-heading`)}`);
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
