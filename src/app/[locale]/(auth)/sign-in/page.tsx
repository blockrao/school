import type { Metadata } from "next";
import { FieldError } from "@/components/ui/field-error";
import { OtpInput } from "@/components/ui/otp-input";
import { formatIndianPhone } from "@/lib/phone";
import { requestMagicLink, requestOtp, verifySignInOtp } from "./actions";

// Adapted from design/WhatsApp Alerts.dc.html (steps 5a "Your WhatsApp number" / 5b
// "Enter the code") as a standalone, reusable route rather than steps embedded in the
// Alerts flow — Shortlist and Enquiry need the same OTP step and shouldn't each
// re-implement it. `?next=` carries the caller back to wherever it came from.
//
// Email magic-link added alongside phone OTP (no design reference — phone was the
// only method shown) so sign-in works without SMS. Sends via
// supabase.auth.signInWithOtp({ email }), landing on /auth/callback.

type Copy = {
  title: string;
  subtitle: string;
  phoneLabel: string;
  sendCode: string;
  codeSentTo: string;
  otpLabel: string;
  verify: string;
  changeNumber: string;
  orEmail: string;
  emailLabel: string;
  sendLink: string;
  linkSentTo: string;
  linkSentBody: string;
  useDifferentEmail: string;
  errorInvalidPhone: string;
  errorInvalidEmail: string;
  errorSendFailed: string;
  errorInvalidCode: string;
  errorRateLimited: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Sign in",
    subtitle: "We'll text you a 6-digit code to sign in — no password needed.",
    phoneLabel: "Mobile number",
    sendCode: "Send code",
    codeSentTo: "Code sent to",
    otpLabel: "Enter the 6-digit code",
    verify: "Verify & sign in",
    changeNumber: "Change number",
    orEmail: "Or sign in with email",
    emailLabel: "Email address",
    sendLink: "Send magic link",
    linkSentTo: "Link sent to",
    linkSentBody: "Open the email and tap the link to sign in. You can close this tab.",
    useDifferentEmail: "Use a different email",
    errorInvalidPhone: "Enter a valid 10-digit Indian mobile number.",
    errorInvalidEmail: "Enter a valid email address.",
    errorSendFailed: "Couldn't send it. Please try again.",
    errorInvalidCode: "That code didn't work. Please try again.",
    errorRateLimited: "Too many attempts. Please wait a few minutes and try again.",
  },
  hi: {
    title: "साइन इन करें",
    subtitle: "साइन इन करने के लिए हम आपको 6 अंकों का कोड भेजेंगे — पासवर्ड की ज़रूरत नहीं।",
    phoneLabel: "मोबाइल नंबर",
    sendCode: "कोड भेजें",
    codeSentTo: "कोड भेजा गया",
    otpLabel: "6 अंकों का कोड डालें",
    verify: "सत्यापित करें और साइन इन करें",
    changeNumber: "नंबर बदलें",
    orEmail: "या ईमेल से साइन इन करें",
    emailLabel: "ईमेल पता",
    sendLink: "मैजिक लिंक भेजें",
    linkSentTo: "लिंक भेजा गया",
    linkSentBody: "ईमेल खोलें और साइन इन करने के लिए लिंक पर टैप करें। आप यह टैब बंद कर सकते हैं।",
    useDifferentEmail: "दूसरा ईमेल इस्तेमाल करें",
    errorInvalidPhone: "एक मान्य 10 अंकों का भारतीय मोबाइल नंबर डालें।",
    errorInvalidEmail: "एक मान्य ईमेल पता डालें।",
    errorSendFailed: "भेजा नहीं जा सका। कृपया फिर से कोशिश करें।",
    errorInvalidCode: "यह कोड काम नहीं किया। कृपया फिर से कोशिश करें।",
    errorRateLimited: "बहुत सारे प्रयास। कृपया कुछ मिनट रुकें और फिर से कोशिश करें।",
  },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-in">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";

  const phone = first(rawSearchParams.phone) ?? "";
  const email = first(rawSearchParams.email) ?? "";
  const next = first(rawSearchParams.next) ?? `/${locale}`;
  const errorCode = first(rawSearchParams.error);

  const errorMessage =
    errorCode === "invalid_phone"
      ? copy.errorInvalidPhone
      : errorCode === "invalid_email"
        ? copy.errorInvalidEmail
        : errorCode === "send_failed"
          ? copy.errorSendFailed
          : errorCode === "invalid_code"
            ? copy.errorInvalidCode
            : errorCode === "rate_limited"
              ? copy.errorRateLimited
              : undefined;

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {copy.title}
      </h1>
      <p className="mt-2 text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
        {copy.subtitle}
      </p>

      {phone ? (
        <form action={verifySignInOtp} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="phone" value={phone} />
          <p className="text-meta font-semibold text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.codeSentTo} {formatIndianPhone(phone)}
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink" lang={isHi ? "hi" : undefined}>
              {copy.otpLabel}
            </span>
            <OtpInput name="otp" autoSubmit error={errorMessage} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="flex h-12 items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
              lang={isHi ? "hi" : undefined}
            >
              {copy.verify}
            </button>
            <a
              href={`/${locale}/sign-in?next=${encodeURIComponent(next)}`}
              className="text-meta font-semibold text-ruled-blue"
              lang={isHi ? "hi" : undefined}
            >
              {copy.changeNumber}
            </a>
          </div>
        </form>
      ) : email ? (
        <div className="mt-6 flex flex-col gap-3 rounded-md border border-rule bg-copy-white p-4">
          <p className="font-semibold" lang={isHi ? "hi" : undefined}>
            {copy.linkSentTo} {email}
          </p>
          <p className="text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.linkSentBody}
          </p>
          <a
            href={`/${locale}/sign-in?next=${encodeURIComponent(next)}`}
            className="w-fit text-meta font-semibold text-ruled-blue"
            lang={isHi ? "hi" : undefined}
          >
            {copy.useDifferentEmail}
          </a>
        </div>
      ) : (
        <>
          <form action={requestOtp} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="next" value={next} />
            <label className="flex flex-col gap-1.5">
              <span
                className="text-meta font-semibold text-muted-ink"
                lang={isHi ? "hi" : undefined}
              >
                {copy.phoneLabel}
              </span>
              <div className="flex max-w-80 items-stretch">
                <span className="flex h-12 items-center rounded-l-md border border-r-0 border-line-blue-strong bg-margin-paper px-3 text-body text-muted-ink">
                  +91
                </span>
                <input
                  type="tel"
                  name="phone"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  required
                  className="h-12 w-full rounded-r-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
                />
              </div>
              {(errorCode === "invalid_phone" ||
                errorCode === "send_failed" ||
                errorCode === "rate_limited") &&
                errorMessage && <FieldError id="phone-error">{errorMessage}</FieldError>}
            </label>
            <button
              type="submit"
              className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
              lang={isHi ? "hi" : undefined}
            >
              {copy.sendCode}
            </button>
          </form>

          <div className="mt-8 border-t border-rule pt-6">
            <p className="text-meta font-semibold text-muted-ink" lang={isHi ? "hi" : undefined}>
              {copy.orEmail}
            </p>
            <form action={requestMagicLink} className="mt-3 flex flex-col gap-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="next" value={next} />
              <label className="flex flex-col gap-1.5">
                <span
                  className="text-meta font-semibold text-muted-ink"
                  lang={isHi ? "hi" : undefined}
                >
                  {copy.emailLabel}
                </span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  className="h-12 max-w-80 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
                />
                {(errorCode === "invalid_email" || errorCode === "rate_limited") &&
                  errorMessage && <FieldError id="email-error">{errorMessage}</FieldError>}
              </label>
              <button
                type="submit"
                className="flex h-12 w-fit items-center rounded-md border border-ruled-blue px-5 font-semibold text-ruled-blue"
                lang={isHi ? "hi" : undefined}
              >
                {copy.sendLink}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
