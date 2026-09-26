"use server";

import { redirect } from "next/navigation";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

export async function approveApplication(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const applicationId = String(formData.get("applicationId") ?? "");

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/my/admissions`)}`);
  }

  await supabase.rpc("approve_application", { p_application_id: applicationId });

  redirect(`/${locale}/my/admissions`);
}
