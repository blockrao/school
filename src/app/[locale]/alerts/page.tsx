import type { Metadata } from "next";
import Link from "next/link";
import { newsRootPath } from "@/lib/urls";

const COPY = {
  en: {
    title: "WhatsApp admission alerts are coming soon",
    body:
      "We’re preparing the alert delivery service. WhatsApp subscriptions are not open yet, and we won’t collect your phone number or consent until delivery is ready.",
    link: "Browse school news and announcements",
  },
  hi: {
    title: "व्हाट्सएप प्रवेश अलर्ट जल्द उपलब्ध होंगे",
    body:
      "हम अलर्ट भेजने की सेवा तैयार कर रहे हैं। सेवा शुरू होने तक व्हाट्सएप सब्सक्रिप्शन उपलब्ध नहीं हैं और हम आपका फोन नंबर या सहमति दर्ज नहीं करेंगे।",
    link: "स्कूल की खबरें और घोषणाएं देखें",
  },
} as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/alerts">): Promise<Metadata> {
  const { locale } = await params;
  const copy = locale === "hi" ? COPY.hi : COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

export default async function AlertsPage({ params }: PageProps<"/[locale]/alerts">) {
  const { locale } = await params;
  const isHi = locale === "hi";
  const copy = isHi ? COPY.hi : COPY.en;

  return (
    <main className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1
        className="font-display text-title-m md:text-title-d"
        lang={isHi ? "hi" : undefined}
      >
        {copy.title}
      </h1>
      <p
        className="mt-3 max-w-prose text-body text-muted-ink"
        lang={isHi ? "hi" : undefined}
      >
        {copy.body}
      </p>
      <p className="mt-6">
        <Link
          href={newsRootPath(locale)}
          className="font-semibold text-ruled-blue underline underline-offset-4"
          lang={isHi ? "hi" : undefined}
        >
          {copy.link}
        </Link>
      </p>
    </main>
  );
}
