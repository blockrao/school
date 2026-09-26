import type { Metadata } from "next";

import { localeAlternates, localeCanonical } from "@/lib/seo";

// design-pending — no design file for a legal page. Placeholder content only,
// same status/reasoning as terms/page.tsx (see that file's comment).

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Privacy Notice — SchoolOye",
    alternates: {
      canonical: localeCanonical(locale, "/privacy"),
      languages: localeAlternates("/privacy"),
    },
  };
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Privacy Notice</h1>
      <p className="mt-2 text-meta text-muted-ink">
        Placeholder — pending legal review. Last updated September 2026.
      </p>
      <div className="mt-6 flex flex-col gap-4 text-body">
        <p>
          SchoolOye collects your phone number or email (for sign-in), your name, and, where you
          choose to provide them, your children's details and documents for the admission-help flow.
          We use this only to run the account you asked for — sending you the alerts and updates you
          subscribed to, and helping schools process the applications you submit. SchoolOye does not
          sell your data.
        </p>
        <p>
          Full, legally-reviewed Privacy Notice (including data retention periods and your rights
          under India's Digital Personal Data Protection Act) will replace this placeholder before
          the site opens to the public. Questions in the meantime: grievance@schooloye.in.
        </p>
      </div>
    </div>
  );
}
