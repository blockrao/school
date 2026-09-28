import type { Metadata } from "next";
import Link from "next/link";
import { localePrefix } from "@/lib/urls";
import { requestPasswordReset } from "../sign-in/password-actions";

type Copy = {
  title: string;
  subtitle: string;
  emailLabel: string;
  send: string;
  backToSignIn: string;
  sentTitle: string;
  sentBody: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Reset your password",
    subtitle: "Enter your email and we'll send you a reset link.",
    emailLabel: "Email address",
    send: "Send reset link",
    backToSignIn: "Back to sign in",
    sentTitle: "Check your email",
    sentBody:
      "If that address has an account, we've sent a link to reset your password. It's valid for a limited time.",
  },
  hi: {
    title: "अपना पासवर्ड रीसेट करें",
    subtitle: "अपना ईमेल डालें और हम आपको एक रीसेट लिंक भेजेंगे।",
    emailLabel: "ईमेल पता",
    send: "रीसेट लिंक भेजें",
    backToSignIn: "साइन इन पर वापस जाएं",
    sentTitle: "अपना ईमेल जांचें",
    sentBody:
      "अगर उस पते का खाता है, तो हमने आपका पासवर्ड रीसेट करने के लिए एक लिंक भेजा है। यह सीमित समय के लिए मान्य है।",
  },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/forgot-password">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";
  const sent = first(rawSearchParams.sent) === "1";

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {copy.title}
      </h1>
      <p className="mt-2 text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
        {copy.subtitle}
      </p>

      {sent ? (
        <div className="mt-6 flex flex-col gap-3 rounded-md border border-rule bg-copy-white p-4">
          <p className="font-semibold" lang={isHi ? "hi" : undefined}>
            {copy.sentTitle}
          </p>
          <p className="text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.sentBody}
          </p>
        </div>
      ) : (
        <form action={requestPasswordReset} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
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
          </label>
          <button
            type="submit"
            className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
            lang={isHi ? "hi" : undefined}
          >
            {copy.send}
          </button>
        </form>
      )}

      <p className="mt-6 text-meta">
        <Link href={`${localePrefix(locale)}/sign-in`} className="font-semibold text-ruled-blue">
          {copy.backToSignIn}
        </Link>
      </p>
    </div>
  );
}
