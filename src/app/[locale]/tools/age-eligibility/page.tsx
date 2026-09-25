import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { ageAtDate, nextAcademicYear, referenceDates } from "@/lib/age";
import { getSelectedCityArea } from "@/lib/db/public-adapter";

// Ported from design/Age Checker.dc.html with one deliberate change: the design
// shows a confident "Eligible for Nursery in 2027–28" verdict sourced from a
// specific Delhi Directorate of Education notice, with a mock list of schools
// and their cut-offs. We have no verified per-school or per-board age-cut-off
// data for Rajasthan/Jaipur in the database — asserting a specific verdict
// would be fabricated data. This adapts the same underlying value (help a
// parent understand age eligibility) into what's actually knowable: an exact,
// real age-on-date calculation against the three cut-off dates different
// boards commonly publish, plus clearly-labelled general guidance — never a
// specific "eligible" claim tied to a source we don't have.

type Copy = {
  title: string;
  subtitle: string;
  dobLabel: string;
  submit: string;
  resultsHeading: string;
  yearsLabel: string;
  monthsLabel: string;
  generalHeading: string;
  generalNote: string;
  disclaimer: string;
  ctaLabel: (city: string) => string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Check age eligibility",
    subtitle:
      "Enter your child's date of birth to see their exact age on the admission cut-off dates different schools commonly use.",
    dobLabel: "Child's date of birth",
    submit: "Check eligibility",
    resultsHeading: "Age as of common cut-off dates",
    yearsLabel: "years",
    monthsLabel: "months",
    generalHeading: "What schools usually require",
    generalNote:
      "Most schools ask for a minimum age of 3 years for Nursery, 4 for LKG, 5 for UKG and 6 for Class 1 — but the exact cut-off date and any age relaxation is set by each school, not a fixed national rule.",
    disclaimer:
      "This is a general guide, not a verified rule for any specific school. Always check the school's own admission notice for its exact age criteria.",
    ctaLabel: (city) => `Browse schools in ${city}`,
  },
  hi: {
    title: "उम्र के हिसाब से पात्रता देखें",
    subtitle:
      "अलग-अलग स्कूलों में आम तौर पर इस्तेमाल होने वाली प्रवेश कट-ऑफ़ तारीख़ों पर बच्चे की सटीक उम्र देखने के लिए जन्म तिथि डालें।",
    dobLabel: "बच्चे की जन्म तिथि",
    submit: "पात्रता देखें",
    resultsHeading: "सामान्य कट-ऑफ़ तारीख़ों पर उम्र",
    yearsLabel: "साल",
    monthsLabel: "महीने",
    generalHeading: "स्कूल आमतौर पर क्या माँगते हैं",
    generalNote:
      "ज़्यादातर स्कूल नर्सरी के लिए कम से कम 3 साल, एलकेजी के लिए 4, यूकेजी के लिए 5 और कक्षा 1 के लिए 6 साल की उम्र माँगते हैं — लेकिन सटीक कट-ऑफ़ तारीख़ और छूट हर स्कूल ख़ुद तय करता है, यह कोई तय राष्ट्रीय नियम नहीं है।",
    disclaimer:
      "यह एक सामान्य मार्गदर्शिका है, किसी ख़ास स्कूल का सत्यापित नियम नहीं। सही उम्र मापदंड के लिए हमेशा स्कूल की अपनी प्रवेश सूचना देखें।",
    ctaLabel: (city) => `${city} के स्कूल देखें`,
  },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tools/age-eligibility">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    description: copy.subtitle,
    alternates: {
      canonical: "/tools/age-eligibility",
      languages: { "en-IN": "/en/tools/age-eligibility", "hi-IN": "/hi/tools/age-eligibility" },
    },
  };
}

export default async function AgeEligibilityPage({
  params,
  searchParams,
}: PageProps<"/[locale]/tools/age-eligibility">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";

  const dobParam = first(rawSearchParams.dob);
  const dob = dobParam ? new Date(`${dobParam}T00:00:00`) : null;
  const validDob = dob && !Number.isNaN(dob.getTime()) ? dob : null;

  const today = new Date();
  const academicYear = nextAcademicYear(today);
  const dates = referenceDates(academicYear);
  const area = await getSelectedCityArea();
  const cityLabel = area?.cityName ?? (isHi ? "अपने शहर" : "your city");

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {copy.title}
      </h1>
      <p
        className="mt-2 max-w-(--container-read) text-body text-muted-ink"
        lang={isHi ? "hi" : undefined}
      >
        {copy.subtitle}
      </p>

      <Form
        action={`/${locale}/tools/age-eligibility`}
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.dobLabel}
          </span>
          <input
            type="date"
            name="dob"
            defaultValue={dobParam ?? ""}
            max={today.toISOString().slice(0, 10)}
            required
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>
        <button
          type="submit"
          className="flex h-12 items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
          lang={isHi ? "hi" : undefined}
        >
          {copy.submit}
        </button>
      </Form>

      {validDob && (
        <div className="mt-8 flex flex-col gap-3">
          <h2 className="font-display text-card font-semibold" lang={isHi ? "hi" : undefined}>
            {copy.resultsHeading}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {dates.map(({ label, date }) => {
              const age = ageAtDate(validDob, date);
              return (
                <div key={label} className="rounded-md border border-rule bg-copy-white p-4">
                  <span className="text-meta text-muted-ink">
                    {label} {academicYear}
                  </span>
                  <div className="mt-1 font-display text-section font-bold">
                    {age.years} <span className="text-card font-medium">{copy.yearsLabel}</span>{" "}
                    {age.months} <span className="text-card font-medium">{copy.monthsLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-md border border-rule bg-margin-paper p-4">
        <h2 className="font-display text-card font-semibold" lang={isHi ? "hi" : undefined}>
          {copy.generalHeading}
        </h2>
        <p className="mt-1.5 text-body" lang={isHi ? "hi" : undefined}>
          {copy.generalNote}
        </p>
      </div>

      <p className="mt-4 text-meta text-slate" lang={isHi ? "hi" : undefined}>
        {copy.disclaimer}
      </p>

      <Link
        href={`/${locale}/schools`}
        className="mt-6 inline-flex h-12 items-center rounded-md border border-ruled-blue px-5 font-semibold text-ruled-blue"
        lang={isHi ? "hi" : undefined}
      >
        {copy.ctaLabel(cityLabel)}
      </Link>
    </div>
  );
}
