"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPublicCityBySlug } from "@/lib/db/public-adapter";
import { createSessionClient } from "@/lib/db/session";

const ALERTS_NOTICE_VERSION = "whatsapp-alerts-2026-09";

const subscribeSchema = z.object({
  locale: z.string().min(1),
  citySlug: z.string().min(1),
  classCodes: z.array(z.string()).min(1),
  schoolId: z.string().optional(),
});

export async function subscribeToAlerts(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const citySlug = String(formData.get("citySlug") ?? "");
  const schoolId = formData.get("schoolId");
  const parsed = subscribeSchema.safeParse({
    locale,
    citySlug,
    classCodes: formData.getAll("classCodes"),
    schoolId: typeof schoolId === "string" && schoolId.length > 0 ? schoolId : undefined,
  });
  const consented = formData.get("consent") === "on";

  if (!parsed.success || !consented) {
    const params = new URLSearchParams({ error: !consented ? "consent_required" : "invalid" });
    if (schoolId && typeof schoolId === "string") params.set("school_id", schoolId);
    redirect(`/${locale}/alerts?${params.toString()}`);
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/alerts`)}`);
  }

  const city = await getPublicCityBySlug(parsed.data.citySlug);
  if (!city) {
    redirect(`/${locale}/alerts?error=invalid`);
  }

  await supabase.from("consents").insert({
    user_id: user.id,
    phone: user.phone ?? null,
    purpose: "whatsapp_alerts",
    notice_version: ALERTS_NOTICE_VERSION,
    channel: "whatsapp",
  });

  const { data: existing } = await supabase
    .from("alert_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("city_id", city.id)
    .eq("active", true)
    .maybeSingle();

  const schoolIds = parsed.data.schoolId ? [parsed.data.schoolId] : [];

  if (existing) {
    await supabase
      .from("alert_subscriptions")
      .update({
        class_codes: parsed.data.classCodes,
        school_ids: schoolIds,
        language: locale,
        whatsapp_opt_in_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("alert_subscriptions").insert({
      user_id: user.id,
      phone: user.phone ?? "",
      city_id: city.id,
      class_codes: parsed.data.classCodes,
      school_ids: schoolIds,
      language: locale,
      whatsapp_opt_in_at: new Date().toISOString(),
    });
  }

  redirect(`/${locale}/alerts?confirmed=1`);
}
