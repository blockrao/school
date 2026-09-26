"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

const nameSchema = z.object({ fullName: z.string().trim().min(1).max(200) });

export async function updateName(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const parsed = nameSchema.safeParse({ fullName: formData.get("fullName") });

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/my/account`)}`);
  }

  if (!parsed.success) {
    redirect(`/${locale}/my/account?error=invalid_name`);
  }

  await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("user_id", user.id);
  redirect(`/${locale}/my/account?saved=1`);
}

/** Signs out. scope "local" = this device/session only; "global" = every device. */
export async function signOut(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const scope = formData.get("scope") === "global" ? "global" : "local";

  const supabase = await createSessionClient();
  await supabase.auth.signOut({ scope });
  redirect(`/${locale}`);
}
