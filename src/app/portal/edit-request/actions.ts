"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getMySchoolId } from "@/lib/db/portal";
import { createSessionClient } from "@/lib/db/session";

const editRequestSchema = z.object({
  field: z.string().trim().min(1),
  currentValue: z.string().trim().optional(),
  newValue: z.string().trim().min(1),
});

export async function submitEditRequest(formData: FormData) {
  const path = "/portal/edit-request";

  const parsed = editRequestSchema.safeParse({
    field: formData.get("field"),
    currentValue: formData.get("currentValue") || undefined,
    newValue: formData.get("newValue"),
  });
  if (!parsed.success) {
    redirect(`${path}?error=invalid`);
  }

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/en/sign-in?next=${encodeURIComponent(path)}`);

  const { error } = await supabase.from("correction_requests").insert({
    school_id: schoolId,
    requester: user.id,
    kind: "profile_field",
    details: JSON.stringify({
      field: parsed.data.field,
      current_value: parsed.data.currentValue ?? null,
      new_value: parsed.data.newValue,
    }),
  });

  if (error) {
    redirect(`${path}?error=submit_failed`);
  }

  redirect("/portal?edit_requested=1");
}
