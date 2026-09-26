import type { Metadata } from "next";
import Link from "next/link";
import { FieldError } from "@/components/ui/field-error";
import { signUpWithPassword } from "../sign-in/password-actions";

type Copy = {
  title: string;
  subtitle: string;
  emailLabel: string;
  passwordLabel: string;
  passwordHint: string;
  confirmLabel: string;
  createAccount: string;
  haveAccount: string;
  signIn: string;
  sentTitle: string;
  sentBody: string;
  errorInvalidEmail: string;
  errorWeakPassword: string;
  errorPasswordMismatch: string;
  errorRateLimited: string;
  errorSendFailed: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Create an account",
    subtitle: "Sign up with your email and a password.",
    emailLabel: "Email address",
    passwordLabel: "Password",
    passwordHint: "At least 10 characters.",
    confirmLabel: "Confirm password",
    createAccount: "Create account",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    sentTitle: "Check your email",
    sentBody:
      "If that address isn't already registered, we've sent a confirmation link — open it to finish creating your account.",
    errorInvalidEmail: "Enter a valid email address.",
    errorWeakPassword: "Use at least 10 characters.",
    errorPasswordMismatch: "Passwords don't match.",
    errorRateLimited: "Too many attempts. Please wait a few minutes and try again.",
    errorSendFailed: "Something went wrong. Please try again.",
  },
  hi: {
    title: "खाता बनाएं",
    subtitle: "अपने ईमेल और पासवर्ड से साइन अप करें।",
    emailLabel: "ईमेल पता",
    passwordLabel: "पासवर्ड",
    passwordHint: "कम से कम 10 अक्षर।",
    confirmLabel: "पासवर्ड की पुष्टि करें",
    createAccount: "खाता बनाएं",
    haveAccount: "पहले से खाता है?",
    signIn: "साइन इन करें",
    sentTitle: "अपना ईमेल जांचें",
    sentBody:
      "अगर वह पता पहले से पंजीकृत नहीं है, तो हमने एक पुष्टिकरण लिंक भेजा है — अपना खाता बनाना पूरा करने के लिए उसे खोलें।",
    errorInvalidEmail: "एक मान्य ईमेल पता डालें।",
    errorWeakPassword: "कम से कम 10 अक्षर इस्तेमाल करें।",
    errorPasswordMismatch: "पासवर्ड मेल नहीं खाते।",
    errorRateLimited: "बहुत सारे प्रयास। कृपया कुछ मिनट रुकें और फिर से कोशिश करें।",
    errorSendFailed: "कुछ गलत हो गया। कृपया फिर से कोशिश करें।",
  },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-up">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

export default async function SignUpPage({ params, searchParams }: PageProps<"/[locale]/sign-up">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";

  const email = first(rawSearchParams.email) ?? "";
  const next = first(rawSearchParams.next) ?? `/${locale}`;
  const errorCode = first(rawSearchParams.error);

  const errorMessage =
    errorCode === "invalid_email"
      ? copy.errorInvalidEmail
      : errorCode === "weak_password"
        ? copy.errorWeakPassword
        : errorCode === "password_mismatch"
          ? copy.errorPasswordMismatch
          : errorCode === "rate_limited"
            ? copy.errorRateLimited
            : errorCode === "send_failed"
              ? copy.errorSendFailed
              : undefined;

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {copy.title}
      </h1>
      <p className="mt-2 text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
        {copy.subtitle}
      </p>

      {email ? (
        <div className="mt-6 flex flex-col gap-3 rounded-md border border-rule bg-copy-white p-4">
          <p className="font-semibold" lang={isHi ? "hi" : undefined}>
            {copy.sentTitle}
          </p>
          <p className="text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.sentBody}
          </p>
        </div>
      ) : (
        <form action={signUpWithPassword} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={next} />
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink" lang={isHi ? "hi" : undefined}>
              {copy.emailLabel}
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="h-12 max-w-80 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
            {errorCode === "invalid_email" && errorMessage && (
              <FieldError id="email-error">{errorMessage}</FieldError>
            )}
          </label>
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
          {(errorCode === "rate_limited" || errorCode === "send_failed") && errorMessage && (
            <FieldError id="form-error">{errorMessage}</FieldError>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
              lang={isHi ? "hi" : undefined}
            >
              {copy.createAccount}
            </button>
          </div>
          <p className="text-meta text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.haveAccount}{" "}
            <Link
              href={`/${locale}/sign-in?next=${encodeURIComponent(next)}`}
              className="font-semibold text-ruled-blue"
            >
              {copy.signIn}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
