import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConsentCheckbox } from "@/components/ui/consent-checkbox";
import { FieldError } from "@/components/ui/field-error";
import { getSelectedCityArea, listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { formatIndianPhone } from "@/lib/phone";
import { localePrefix } from "@/lib/urls";
import { subscribeToAlerts } from "./actions";

// Adapted from design/WhatsApp Alerts.dc.html (steps 5a–5e), with two deliberate
// deviations: (1) the phone entry/OTP-verify steps (5a/5b) are factored into the
// shared /sign-in gate instead of being embedded here, since Shortlist and Enquiry
// need the same OTP step and shouldn't each re-implement it; (2) step 5c's class
// picker is a single Nursery/LKG/UKG dropdown, but no school in the database has
// those grade codes (min_class/max_class are only ever "c1".."c12" — see
// src/lib/grades.ts) — a checkbox grid over the classes that actually exist avoids
// offering options that would silently match nothing. Step 5e's "when to message
// me" delivery-timing toggles have no backing column on alert_subscriptions and
// aren't built here.

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

type Copy = {
  title: string;
  subtitle: string;
  classesLabel: string;
  classPrefix: string;
  consentLabel: (phone: string) => string;
  privacyNote: string;
  submit: string;
  errorConsent: string;
  confirmedTitle: string;
  confirmedBody: string;
  schoolScoped: (name: string) => string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Get WhatsApp alerts",
    subtitle:
      "We'll message you on WhatsApp when admission windows open or deadlines are coming up for the classes you pick.",
    classesLabel: "Which classes?",
    classPrefix: "Class",
    consentLabel: (phone) =>
      `I agree to get admission alerts from SchoolOye on WhatsApp at ${phone}.`,
    privacyNote:
      "We use your number only for these alerts. No marketing, and schools never see it.",
    submit: "Subscribe",
    errorConsent: "Please agree to be contacted before subscribing.",
    confirmedTitle: "You're subscribed",
    confirmedBody:
      "We'll message you on WhatsApp when there's an update for the classes you picked.",
    schoolScoped: (name) => `For ${name}`,
  },
  hi: {
    title: "व्हाट्सएप अलर्ट पाएं",
    subtitle:
      "जब आपकी चुनी हुई कक्षाओं के लिए प्रवेश शुरू हों या डेडलाइन नज़दीक हो, तो हम आपको व्हाट्सएप पर बताएंगे।",
    classesLabel: "कौन सी कक्षाएं?",
    classPrefix: "कक्षा",
    consentLabel: (phone) => `मैं SchoolOye से ${phone} पर व्हाट्सएप के ज़रिए प्रवेश अलर्ट पाने के लिए सहमत हूं।`,
    privacyNote:
      "हम आपका नंबर केवल इन अलर्ट के लिए इस्तेमाल करते हैं। कोई मार्केटिंग नहीं, और स्कूल इसे कभी नहीं देखते।",
    submit: "सब्सक्राइब करें",
    errorConsent: "सब्सक्राइब करने से पहले कृपया सहमति दें।",
    confirmedTitle: "आप सब्सक्राइब हो गए हैं",
    confirmedBody: "जब आपकी चुनी हुई कक्षाओं के लिए कोई अपडेट होगा, हम आपको व्हाट्सएप पर बताएंगे।",
    schoolScoped: (name) => `${name} के लिए`,
  },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/alerts">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

export default async function AlertsPage({ params, searchParams }: PageProps<"/[locale]/alerts">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";

  const schoolId = first(rawSearchParams.school_id);
  const confirmed = first(rawSearchParams.confirmed) === "1";
  const errorCode = first(rawSearchParams.error);

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);

  if (!user) {
    const next = new URLSearchParams();
    next.set("next", `${localePrefix(locale)}/alerts${schoolId ? `?school_id=${schoolId}` : ""}`);
    redirect(`${localePrefix(locale)}/sign-in?${next.toString()}`);
  }

  const [school, area] = await Promise.all([
    schoolId ? listPublicSchoolsByIds([schoolId]).then((rows) => rows.at(0)) : undefined,
    getSelectedCityArea(),
  ]);
  const citySlug = area?.citySlug ?? "jaipur";

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {copy.title}
      </h1>
      <p className="mt-2 text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
        {copy.subtitle}
      </p>
      {school?.name_en && (
        <p className="mt-1 text-meta font-semibold text-ruled-blue" lang={isHi ? "hi" : undefined}>
          {copy.schoolScoped(school.name_en)}
        </p>
      )}

      {confirmed ? (
        <div className="mt-8 flex flex-col gap-1.5 border-l-2 border-ink py-1 pl-3.5">
          <span className="font-display text-card font-semibold" lang={isHi ? "hi" : undefined}>
            {copy.confirmedTitle}
          </span>
          <span className="text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.confirmedBody}
          </span>
        </div>
      ) : (
        <form action={subscribeToAlerts} className="mt-6 flex flex-col gap-5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="citySlug" value={citySlug} />
          {schoolId && <input type="hidden" name="schoolId" value={schoolId} />}

          <fieldset className="flex flex-col gap-2">
            <legend
              className="mb-1 text-meta font-semibold text-muted-ink"
              lang={isHi ? "hi" : undefined}
            >
              {copy.classesLabel}
            </legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {CLASS_OPTIONS.map((n) => (
                <label
                  key={n}
                  className="flex h-11 items-center justify-center gap-1 rounded-md border border-line-blue text-body has-[:checked]:border-ruled-blue has-[:checked]:bg-pill-results-bg has-[:checked]:text-ruled-blue"
                >
                  <input
                    type="checkbox"
                    name="classCodes"
                    value={`c${n}`}
                    className="sr-only"
                    defaultChecked={school ? n === school.max_class?.replace("c", "") : false}
                  />
                  <span lang={isHi ? "hi" : undefined}>
                    {copy.classPrefix} {n}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <ConsentCheckbox
            name="consent"
            required
            error={errorCode === "consent_required" ? copy.errorConsent : undefined}
          >
            <span lang={isHi ? "hi" : undefined}>
              {copy.consentLabel(formatIndianPhone(user.phone ?? ""))}
            </span>
          </ConsentCheckbox>
          <p className="text-meta text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.privacyNote}
          </p>
          {errorCode === "invalid" && (
            <FieldError id="alerts-error">Something went wrong. Please try again.</FieldError>
          )}

          <button
            type="submit"
            className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
            lang={isHi ? "hi" : undefined}
          >
            {copy.submit}
          </button>
        </form>
      )}
    </div>
  );
}
