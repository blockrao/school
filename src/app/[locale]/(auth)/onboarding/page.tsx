import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConsentCheckbox } from "@/components/ui/consent-checkbox";
import { FieldError } from "@/components/ui/field-error";
import { needsOnboarding } from "@/lib/db/onboarding";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { completeOnboarding } from "./actions";

// design-pending — no design file for first-login onboarding (the design set only
// covers the phone/email sign-in steps). Minimal functional version built from
// existing primitives (ConsentCheckbox, FieldError). Logged in docs/design-gaps.md.

type Copy = {
  title: string;
  subtitle: string;
  nameLabel: string;
  consentPrefix: string;
  termsLabel: string;
  consentJoiner: string;
  privacyLabel: string;
  continue: string;
  errorInvalidName: string;
  errorConsent: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Welcome to SchoolOye",
    subtitle: "A couple of things before you continue.",
    nameLabel: "Your name",
    consentPrefix: "I agree to the",
    termsLabel: "Terms of Service",
    consentJoiner: "and",
    privacyLabel: "Privacy Notice",
    continue: "Continue",
    errorInvalidName: "Enter your name.",
    errorConsent: "Please accept the Terms of Service and Privacy Notice to continue.",
  },
  hi: {
    title: "SchoolOye में आपका स्वागत है",
    subtitle: "आगे बढ़ने से पहले कुछ बातें।",
    nameLabel: "आपका नाम",
    consentPrefix: "मैं",
    termsLabel: "सेवा की शर्तों",
    consentJoiner: "और",
    privacyLabel: "गोपनीयता सूचना से सहमत हूं",
    continue: "जारी रखें",
    errorInvalidName: "अपना नाम डालें।",
    errorConsent: "जारी रखने के लिए कृपया सेवा की शर्तें और गोपनीयता सूचना स्वीकार करें।",
  },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/onboarding">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

export default async function OnboardingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/onboarding">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";

  const next = first(rawSearchParams.next) ?? `/${locale}`;
  const errorCode = first(rawSearchParams.error);

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/onboarding?next=${next}`)}`);
  }

  // Already done (e.g. the user navigated back here manually) — don't re-prompt.
  if (!(await needsOnboarding(supabase, user.id))) {
    redirect(next);
  }

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {copy.title}
      </h1>
      <p className="mt-2 text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
        {copy.subtitle}
      </p>

      <form action={completeOnboarding} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={next} />

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.nameLabel}
          </span>
          <input
            type="text"
            name="fullName"
            autoComplete="name"
            required
            maxLength={200}
            className="h-12 max-w-96 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
          {errorCode === "invalid_name" && (
            <FieldError id="name-error">{copy.errorInvalidName}</FieldError>
          )}
        </label>

        <ConsentCheckbox
          name="consent"
          required
          error={errorCode === "consent_required" ? copy.errorConsent : undefined}
        >
          <span lang={isHi ? "hi" : undefined}>
            {copy.consentPrefix}{" "}
            <Link
              href={`/${locale}/terms`}
              target="_blank"
              className="font-semibold text-ruled-blue"
            >
              {copy.termsLabel}
            </Link>{" "}
            {copy.consentJoiner}{" "}
            <Link
              href={`/${locale}/privacy`}
              target="_blank"
              className="font-semibold text-ruled-blue"
            >
              {copy.privacyLabel}
            </Link>
          </span>
        </ConsentCheckbox>

        <button
          type="submit"
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
          lang={isHi ? "hi" : undefined}
        >
          {copy.continue}
        </button>
      </form>
    </div>
  );
}
