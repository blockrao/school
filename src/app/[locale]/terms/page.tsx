import type { Metadata } from "next";
import { listPublicAreas } from "@/lib/db/public-adapter";
import { localeAlternates, localeCanonical } from "@/lib/seo";

// design-pending — no design file for a legal page. Placeholder content only:
// SchoolOye has no final Terms of Service yet (pending legal review, same
// status as docs/ops/data-retention.md's retention rule). This page exists so
// onboarding has a real, versioned document to link to and record acceptance
// of — the version string below (see src/lib/consent.ts) is what's recorded
// on the user's `consents` row, not this specific wording.

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Terms of Service — SchoolOye",
    alternates: { canonical: localeCanonical(locale, "/terms"), languages: localeAlternates("/terms") },
  };
}

export default async function TermsPage() {
  // Describes the platform's actual current scope, not any one visitor's chosen
  // city — a Terms page states where the service operates, so it lists every
  // launched city rather than following the sy_city cookie.
  const launchedAreas = (await listPublicAreas()).filter((a) => a.is_launch);
  const cityListText =
    launchedAreas.length > 0
      ? launchedAreas.map((a) => `${a.name}, ${a.state}`).join("; ")
      : "the cities it currently serves";

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Terms of Service</h1>
      <p className="mt-2 text-meta text-muted-ink">
        Placeholder — pending legal review. Last updated September 2026.
      </p>
      <div className="mt-6 flex flex-col gap-4 text-body">
        <p>
          SchoolOye is a school discovery and admission-help platform for parents, currently
          operating in {cityListText}. By creating an account you agree to use the site to search
          for schools, contact schools, and manage your own admission applications — SchoolOye does
          not sell admissions, does not guarantee a seat, and does not charge for school listings.
        </p>
        <p>
          Full, legally-reviewed Terms of Service will replace this placeholder before the site
          opens to the public. Questions in the meantime: grievance@schooloye.in.
        </p>
      </div>
    </div>
  );
}
