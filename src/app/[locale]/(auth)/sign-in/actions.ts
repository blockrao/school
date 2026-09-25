"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/db/session";
import { normalizeIndianPhone } from "@/lib/phone";

/**
 * Origin for the magic-link redirect. Prefers NEXT_PUBLIC_SITE_URL (set in
 * Production only) so real users always land back on www.schooloye.com even
 * if the request somehow arrived via a raw vercel.app host. Falls back to the
 * request's own origin when unset — Preview deployments (which don't set
 * NEXT_PUBLIC_SITE_URL) still redirect back to themselves for testing.
 */
async function requestOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Only allow same-origin relative paths as a post-sign-in redirect target (no open redirect). */
function safeNext(next: FormDataEntryValue | null, locale: string): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : `/${locale}`;
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
    redirect(`/${locale}/sign-in?error=invalid_phone&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    redirect(`/${locale}/sign-in?error=send_failed&next=${encodeURIComponent(next)}`);
  }

  redirect(
    `/${locale}/sign-in?phone=${encodeURIComponent(phone)}&next=${encodeURIComponent(next)}`,
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
      `/${locale}/sign-in?phone=${encodeURIComponent(phoneParam)}&error=invalid_code&next=${encodeURIComponent(next)}`,
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
      `/${locale}/sign-in?phone=${encodeURIComponent(parsed.data.phone)}&error=invalid_code&next=${encodeURIComponent(next)}`,
    );
  }

  // Ensures a profile row exists from first sign-in; RLS (profiles_self_insert) already
  // scopes this to the caller's own uid and defaults role to 'parent'.
  await supabase
    .from("profiles")
    .upsert({ user_id: data.user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  redirect(next);
}

const emailSchema = z.object({
  email: z.string().trim().email(),
  locale: z.string().min(1),
});

/**
 * Magic-link sign-in — an alternative to phone OTP for whenever SMS isn't
 * practical to test with (or a user simply prefers email). Supabase's
 * signInWithOtp({ email }) sends a link, not a code; the link lands on
 * /auth/callback (not locale-prefixed — it's a stable URL baked into the sent
 * email, same reasoning /ops and /portal aren't locale-prefixed either), which
 * exchanges the PKCE code for a session and redirects to `next`.
 */
export async function requestMagicLink(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const next = safeNext(formData.get("next"), locale);
  const parsed = emailSchema.safeParse({ email: formData.get("email"), locale });

  if (!parsed.success) {
    redirect(`/${locale}/sign-in?error=invalid_email&next=${encodeURIComponent(next)}`);
  }

  const origin = await requestOrigin();
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    redirect(`/${locale}/sign-in?error=send_failed&next=${encodeURIComponent(next)}`);
  }

  redirect(
    `/${locale}/sign-in?email=${encodeURIComponent(parsed.data.email)}&next=${encodeURIComponent(next)}`,
  );
}
