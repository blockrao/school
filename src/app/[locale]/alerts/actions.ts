"use server";

import { redirect } from "next/navigation";
import { localePrefix } from "@/lib/urls";

/**
 * Delivery is not implemented yet. Keep this server-side guard even though the
 * public page no longer renders a subscription form, so stale pages or direct
 * server-action submissions cannot collect consent or create subscriptions
 * before a verified WhatsApp sender and delivery schedule exist.
 */
export async function subscribeToAlerts(formData: FormData): Promise<never> {
  const locale = formData.get("locale") === "hi" ? "hi" : "en";
  redirect(`${localePrefix(locale)}/alerts?status=unavailable`);
}
