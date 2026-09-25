import type { Metadata } from "next";
import Link from "next/link";
import { listApplicationHelpProducts } from "@/lib/db/application-help";

type Copy = {
  title: string;
  subtitle: string;
  howHeading: string;
  how: { t: string; d: string }[];
  goodToKnowHeading: string;
  goodToKnow: string[];
  cta: string;
  fromPrice: (price: string) => string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Get help applying",
    subtitle:
      "We prepare and submit online forms for the schools you choose. You approve every application before it goes.",
    howHeading: "How it works",
    how: [
      { t: "Pick your schools", d: "Choose from schools with open forms." },
      {
        t: "Share details once",
        d: "Your child's details and documents, used for every form.",
      },
      {
        t: "Approve each form",
        d: "We send a preview. Nothing is submitted without your OK.",
      },
      {
        t: "Track everything",
        d: "Application numbers, lists and interview dates in one place.",
      },
    ],
    goodToKnowHeading: "Good to know",
    goodToKnow: [
      "School form and admission fees are paid separately, directly to the school.",
      "SchoolOye does not sell admissions — schools decide.",
    ],
    cta: "Choose a package",
    fromPrice: (price) => `From ${price} for one school`,
  },
  hi: {
    title: "आवेदन में मदद पाएं",
    subtitle: "आपके चुने हुए स्कूलों के ऑनलाइन फ़ॉर्म हम तैयार करके भेजते हैं। भेजने से पहले हर आवेदन आप मंज़ूर करते हैं।",
    howHeading: "यह कैसे काम करता है",
    how: [
      { t: "अपने स्कूल चुनें", d: "खुले फ़ॉर्म वाले स्कूलों में से चुनें।" },
      {
        t: "विवरण एक बार साझा करें",
        d: "आपके बच्चे का विवरण और दस्तावेज़, हर फ़ॉर्म में इस्तेमाल होंगे।",
      },
      {
        t: "हर फ़ॉर्म मंज़ूर करें",
        d: "हम एक पूर्वावलोकन भेजते हैं। आपकी मंज़ूरी के बिना कुछ नहीं भेजा जाता।",
      },
      {
        t: "सब कुछ ट्रैक करें",
        d: "आवेदन नंबर, सूचियां और इंटरव्यू तारीख़ें एक जगह।",
      },
    ],
    goodToKnowHeading: "जानना ज़रूरी है",
    goodToKnow: [
      "स्कूल फ़ॉर्म और प्रवेश शुल्क अलग से, सीधे स्कूल को दिए जाते हैं।",
      "SchoolOye प्रवेश नहीं बेचता — फ़ैसला स्कूल का होता है।",
    ],
    cta: "पैकेज चुनें",
    fromPrice: (price) => `${price} से, एक स्कूल के लिए`,
  },
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admissions/help">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    description: copy.subtitle,
    alternates: {
      canonical: "/admissions/help",
      languages: { "en-IN": "/en/admissions/help", "hi-IN": "/hi/admissions/help" },
    },
  };
}

export default async function ApplicationHelpLandingPage({
  params,
}: PageProps<"/[locale]/admissions/help">) {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";

  const products = await listApplicationHelpProducts();
  const minPrice = products.length > 0 ? Math.min(...products.map((p) => p.price_inr)) : null;

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

      <div className="mt-6 flex flex-col">
        {copy.how.map((h, i) => (
          <div key={h.t} className="flex gap-3.5 border-t border-rule-soft py-3 first:border-t-0">
            <span className="w-8 shrink-0 border-r-2 border-ink font-display text-section font-bold">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold" lang={isHi ? "hi" : undefined}>
                {h.t}
              </span>
              <span className="text-meta text-muted-ink" lang={isHi ? "hi" : undefined}>
                {h.d}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2 rounded-md border border-rule bg-copy-white p-4">
        <span className="font-semibold" lang={isHi ? "hi" : undefined}>
          {copy.goodToKnowHeading}
        </span>
        {copy.goodToKnow.map((line) => (
          <span key={line} className="text-body" lang={isHi ? "hi" : undefined}>
            {line}
          </span>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-1.5">
        <Link
          href={`/${locale}/admissions/help/package`}
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
          lang={isHi ? "hi" : undefined}
        >
          {copy.cta}
        </Link>
        {minPrice != null && (
          <span className="text-meta text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.fromPrice(`₹${minPrice}`)}
          </span>
        )}
      </div>
    </div>
  );
}
