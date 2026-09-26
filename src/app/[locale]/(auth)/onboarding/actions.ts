"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ACCOUNT_NOTICE_VERSION } from "@/lib/consent";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

/** Only allow same-origin relative paths as a post-onboarding redirect target (no open redirect). */
function safeNext(next: FormDataEntryValue | null, locale: string): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : `/${locale}`;
}

const onboardingSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  locale: z.string().min(1),
});

export async function completeOnboarding(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const next = safeNext(formData.get("next"), locale);
  const consented = formData.get("consent") === "on";

  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    locale,
  });

  if (!parsed.success || !consented) {
    const params = new URLSearchParams({
      error: !consented ? "consent_required" : "invalid_name",
      next,
    });
    redirect(`/${locale}/onboarding?${params.toString()}`);
  }

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/onboarding`)}`);
  }

  await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("user_id", user.id);

  await supabase.from("consents").insert({
    user_id: user.id,
    phone: user.phone ?? null,
    purpose: "account",
    notice_version: ACCOUNT_NOTICE_VERSION,
    channel: "web",
  });

  redirect(next);
}
