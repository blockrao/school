"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMySchoolId, updateAdmissionLeadStatus } from "@/lib/db/portal";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

async function setStatus(formData: FormData, status: "new" | "contacted" | "closed") {
  const leadId = String(formData.get("leadId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !leadId) redirect("/portal/admission-leads");

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  await updateAdmissionLeadStatus(leadId, schoolId, status, user?.id);
  revalidatePath("/portal/admission-leads");
  redirect("/portal/admission-leads?status_updated=1");
}

export async function markLeadContacted(formData: FormData) {
  await setStatus(formData, "contacted");
}

export async function markLeadClosed(formData: FormData) {
  await setStatus(formData, "closed");
}
