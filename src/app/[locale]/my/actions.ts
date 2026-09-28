"use server";

import { redirect } from "next/navigation";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { localePrefix } from "@/lib/urls";

export async function unsubscribeAlert(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const subscriptionId = String(formData.get("subscriptionId") ?? "");

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(
      `${localePrefix(locale)}/sign-in?next=${encodeURIComponent(`${localePrefix(locale)}/my`)}`,
    );
  }

  await supabase
    .from("alert_subscriptions")
    .update({ active: false })
    .eq("id", subscriptionId)
    .eq("user_id", user.id);

  await supabase
    .from("consents")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("purpose", "whatsapp_alerts")
    .is("withdrawn_at", null);

  redirect(`${localePrefix(locale)}/my`);
}
