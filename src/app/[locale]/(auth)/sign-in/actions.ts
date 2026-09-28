"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { needsOnboarding, postSignInPath } from "@/lib/db/onboarding";
import { createSessionClient } from "@/lib/db/session";
import { normalizeIndianPhone } from "@/lib/phone";
import { checkRateLimit } from "@/lib/rate-limit";
import { homePath, localePrefix } from "@/lib/urls";

/** Only allow same-origin relative paths as a post-sign-in redirect target (no open redirect). */
function safeNext(next: FormDataEntryValue | null, locale: string): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : homePath(locale);
}

const requestSchema = z.object({
  phone: z.string().min(1),
  locale: z.string().min(1),
});

export async function requestOtp(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const next = safeNext(formData.get("next"), locale);
  const parsed = requestSchema.safeParse({
    phone: formData.get("phone"),
    locale,
  });

  const phone = parsed.success ? normalizeIndianPhone(parsed.data.phone) : null;
  if (!phone) {
    redirect(
      `${localePrefix(locale)}/sign-in?error=invalid_phone&next=${encodeURIComponent(next)}`,
    );
  }

  // 5 OTP sends per number per 15 minutes — SMS costs money and can be used
  // to spam a phone number that isn't the requester's own.
  const allowed = await checkRateLimit("otp_send", phone, 5, 15 * 60);
  if (!allowed) {
    redirect(`${localePrefix(locale)}/sign-in?error=rate_limited&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    redirect(`${localePrefix(locale)}/sign-in?error=send_failed&next=${encodeURIComponent(next)}`);
  }

  redirect(
    `${localePrefix(locale)}/sign-in?phone=${encodeURIComponent(phone)}&next=${encodeURIComponent(next)}`,
  );
}

const verifySchema = z.object({
  phone: z.string().min(1),
  otp: z.string().length(6),
  locale: z.string().min(1),
});

export async function verifySignInOtp(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const next = safeNext(formData.get("next"), locale);
  const phoneParam = typeof formData.get("phone") === "string" ? String(formData.get("phone")) : "";
  const parsed = verifySchema.safeParse({
    phone: phoneParam,
    otp: formData.get("otp"),
    locale,
  });

  if (!parsed.success) {
    redirect(
      `${localePrefix(locale)}/sign-in?phone=${encodeURIComponent(phoneParam)}&error=invalid_code&next=${encodeURIComponent(next)}`,
    );
  }

  // 8 verify attempts per number per 15 minutes — a 6-digit code has 1e6
  // possibilities; this keeps brute-forcing it computationally pointless
  // without needing a longer code.
  const allowed = await checkRateLimit("otp_verify", parsed.data.phone, 8, 15 * 60);
  if (!allowed) {
    redirect(
      `${localePrefix(locale)}/sign-in?phone=${encodeURIComponent(parsed.data.phone)}&error=rate_limited&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.otp,
    type: "sms",
  });

  if (error || !data.user) {
    redirect(
      `${localePrefix(locale)}/sign-in?phone=${encodeURIComponent(parsed.data.phone)}&error=invalid_code&next=${encodeURIComponent(next)}`,
    );
  }

  // Ensures a profile row exists from first sign-in; RLS (profiles_self_insert) already
  // scopes this to the caller's own uid and defaults role to 'parent'.
  await supabase
    .from("profiles")
    .upsert({ user_id: data.user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const pending = await needsOnboarding(supabase, data.user.id);
  redirect(postSignInPath(pending, locale, next));
}
