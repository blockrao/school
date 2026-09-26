import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { updatePassword } from "../sign-in/password-actions";

type Copy = {
  title: string;
  subtitle: string;
  passwordLabel: string;
  passwordHint: string;
  confirmLabel: string;
  save: string;
  errorWeakPassword: string;
  errorPasswordMismatch: string;
  errorUpdateFailed: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Set a new password",
    subtitle: "Choose a new password for your account.",
    passwordLabel: "New password",
    passwordHint: "At least 10 characters.",
    confirmLabel: "Confirm new password",
    save: "Save password",
    errorWeakPassword: "Use at least 10 characters.",
    errorPasswordMismatch: "Passwords don't match.",
    errorUpdateFailed: "Something went wrong. Please request a new reset link.",
  },
  hi: {
    title: "नया पासवर्ड सेट करें",
    subtitle: "अपने खाते के लिए एक नया पासवर्ड चुनें।",
    passwordLabel: "नया पासवर्ड",
    passwordHint: "कम से कम 10 अक्षर।",
    confirmLabel: "नए पासवर्ड की पुष्टि करें",
    save: "पासवर्ड सेव करें",
    errorWeakPassword: "कम से कम 10 अक्षर इस्तेमाल करें।",
    errorPasswordMismatch: "पासवर्ड मेल नहीं खाते।",
    errorUpdateFailed: "कुछ गलत हो गया। कृपया एक नया रीसेट लिंक मांगें।",
  },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

/**
 * Reached only via the recovery link's redirect through /auth/callback, which
 * already exchanged the code for a real session — so a plain getUser() check
 * (not a special "recovery" mode) is enough to gate this page.
 */
export default async function ResetPasswordPage({
  params,
  searchParams,
}: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";
  const errorCode = first(rawSearchParams.error);

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(`/${locale}/forgot-password`);
  }

  const errorMessage =
    errorCode === "weak_password"
      ? copy.errorWeakPassword
      : errorCode === "password_mismatch"
        ? copy.errorPasswordMismatch
        : errorCode === "update_failed"
          ? copy.errorUpdateFailed
          : undefined;

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {copy.title}
      </h1>
      <p className="mt-2 text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
        {copy.subtitle}
      </p>

      <form action={updatePassword} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.passwordLabel}
          </span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            required
            className="h-12 max-w-80 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
          <span className="text-meta text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.passwordHint}
          </span>
          {errorCode === "weak_password" && errorMessage && (
            <FieldError id="password-error">{errorMessage}</FieldError>
          )}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.confirmLabel}
          </span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={10}
            required
            className="h-12 max-w-80 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
          {errorCode === "password_mismatch" && errorMessage && (
            <FieldError id="confirm-error">{errorMessage}</FieldError>
          )}
        </label>
        {errorCode === "update_failed" && errorMessage && (
          <FieldError id="form-error">{errorMessage}</FieldError>
        )}
        <button
          type="submit"
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
          lang={isHi ? "hi" : undefined}
        >
          {copy.save}
        </button>
      </form>
    </div>
  );
}
