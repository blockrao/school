"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { needsOnboarding, postSignInPath } from "@/lib/db/onboarding";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { checkRateLimit } from "@/lib/rate-limit";

/** Only allow same-origin relative paths as a post-auth redirect target (no open redirect). */
function safeNext(next: FormDataEntryValue | null, locale: string): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : `/${locale}`;
}

/**
 * Origin for password-reset / signup-confirmation redirects. Same logic as
 * sign-in/actions.ts's requestOrigin() — kept here too since this file must
 * not import from a route segment outside its own tree.
 */
async function requestOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Interim while phone OTP (SMS provider) isn't wired up yet — email+password
// is a real credential, so it gets its own, stricter bar than a 6-digit OTP:
// 10+ chars (NIST 800-63B recommends length over forced complexity classes;
// Supabase's own "leaked password protection" / HaveIBeenPwned check should
// also be turned on in the dashboard to catch weak-but-long passwords).
const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "That password is too long.");

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  locale: z.string().min(1),
});

export async function signInWithPassword(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const next = safeNext(formData.get("next"), locale);
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    locale,
  });

  if (!parsed.success) {
    redirect(`/${locale}/sign-in?perror=invalid_credentials&next=${encodeURIComponent(next)}`);
  }

  // 8 attempts per email+IP per 15 minutes — same shape as OTP verify, the
  // real brute-force backstop against a 10+ char password.
  const allowed = await checkRateLimit("password_signin", parsed.data.email, 8, 15 * 60);
  if (!allowed) {
    redirect(`/${locale}/sign-in?perror=rate_limited&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  // Deliberately the same generic message whether the email doesn't exist or
  // the password is wrong — never reveal which, that's an enumeration leak.
  if (error || !data.user) {
    redirect(`/${locale}/sign-in?perror=invalid_credentials&next=${encodeURIComponent(next)}`);
  }

  await supabase
    .from("profiles")
    .upsert({ user_id: data.user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const pending = await needsOnboarding(supabase, data.user.id);
  redirect(postSignInPath(pending, locale, next));
}

const signUpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
    locale: z.string().min(1),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"] });

export async function signUpWithPassword(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const next = safeNext(formData.get("next"), locale);
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    locale,
  });

  if (!parsed.success) {
    const weak = parsed.error.issues.some((i) => i.path[0] === "password");
    const mismatch = parsed.error.issues.some((i) => i.path[0] === "confirmPassword");
    const code = weak ? "weak_password" : mismatch ? "password_mismatch" : "invalid_email";
    redirect(`/${locale}/sign-up?error=${code}&next=${encodeURIComponent(next)}`);
  }

  // 5 sign-up attempts per email+IP per 15 minutes — this is the account-
  // creation path, so it also guards against scripted mass-registration.
  const allowed = await checkRateLimit("password_signup", parsed.data.email, 5, 15 * 60);
  if (!allowed) {
    redirect(`/${locale}/sign-up?error=rate_limited&next=${encodeURIComponent(next)}`);
  }

  const origin = await requestOrigin();
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  // Supabase itself returns a generic (non-erroring, obfuscated) response
  // when the email is already registered, precisely to avoid confirming
  // account existence — we preserve that by always landing on the same
  // "check your email" screen regardless of outcome, same pattern the
  // existing magic-link flow already uses.
  if (error && error.code !== "user_already_exists") {
    redirect(`/${locale}/sign-up?error=send_failed&next=${encodeURIComponent(next)}`);
  }

  redirect(
    `/${locale}/sign-up?email=${encodeURIComponent(parsed.data.email)}&next=${encodeURIComponent(next)}`,
  );
}

const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function requestPasswordReset(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });

  if (parsed.success) {
    // Same email+IP shape as the other send flows.
    const allowed = await checkRateLimit("password_reset", parsed.data.email, 5, 15 * 60);
    if (allowed) {
      const origin = await requestOrigin();
      const supabase = await createSessionClient();
      await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(`/${locale}/reset-password`)}`,
      });
    }
  }

  // Always the same response — never confirm whether the address has an
  // account (enumeration protection), and rate-limit failures fail
  // silently into the same screen for the same reason.
  redirect(`/${locale}/forgot-password?sent=1`);
}

const resetSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string().min(1) })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"] });

export async function updatePassword(formData: FormData) {
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "en";
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const weak = parsed.error.issues.some((i) => i.path[0] === "password");
    redirect(`/${locale}/reset-password?error=${weak ? "weak_password" : "password_mismatch"}`);
  }

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/reset-password`)}`);
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    redirect(`/${locale}/reset-password?error=update_failed`);
  }

  // Reset password everywhere it might be sitting compromised/forgotten —
  // sign out every other session, keep only this one (the one that just
  // proved control of the mailbox).
  await supabase.auth.signOut({ scope: "others" });

  redirect(`/${locale}/my/account?saved=1`);
}
