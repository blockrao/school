import type { Metadata } from "next";
import Link from "next/link";
import { localeAlternates, localeCanonical } from "@/lib/seo";
import { localePrefix } from "@/lib/urls";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/methodology">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "How SchoolOye collects and verifies school facts — SchoolOye",
    description:
      "Where school facts come from, what Verified and Not yet verified mean, how dates stay current, and how to report a correction.",
    alternates: {
      canonical: localeCanonical(locale, "/methodology"),
      languages: localeAlternates("/methodology"),
    },
  };
}

export default async function Page({ params }: PageProps<"/[locale]/methodology">) {
  const { locale } = await params;
  const prefix = localePrefix(locale);
  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">
        How we collect and verify school facts
      </h1>
      <div className="mt-6 flex flex-col gap-4 text-body">
        <h2 className="font-display text-card font-semibold">Where facts come from</h2>
        <p>
          School facts are compiled from official board and government records and from each
          school's own published notices. A school can also confirm or correct its own page after
          claiming it.
        </p>
        <h2 className="font-display text-card font-semibold">What the labels mean</h2>
        <ul className="list-disc pl-6">
          <li>
            <strong>Not yet verified</strong>: compiled from public records, not yet confirmed by
            the school.
          </li>
          <li>
            <strong>Verified</strong>: SchoolOye has checked the fact against its source or the
            school has confirmed it. It is not a rating or a recommendation.
          </li>
          <li>
            <strong>Not yet published</strong>: we do not have the fact. We never estimate or fill
            it in.
          </li>
        </ul>
        <h2 className="font-display text-card font-semibold">Admission dates</h2>
        <p>
          Dates come from the school's own published notice. When a school changes a date, the page
          shows the change and when it was made.
        </p>
        <h2 className="font-display text-card font-semibold">Corrections</h2>
        <p>
          If something on a school page is wrong, tell us at{" "}
          <a href="mailto:grievance@schooloye.in" className="font-semibold text-ruled-blue">
            grievance@schooloye.in
          </a>{" "}
          or ask the school to{" "}
          <Link href="/for-schools" className="font-semibold text-ruled-blue">
            claim its page
          </Link>{" "}
          and fix it directly.
        </p>
        <h2 className="font-display text-card font-semibold">Machine-readable access</h2>
        <p>
          Every school page has a plain markdown version at the same address with{" "}
          <code>/index.md</code> added, and{" "}
          <Link href="/llms.txt" className="font-semibold text-ruled-blue">
            llms.txt
          </Link>{" "}
          describes the site for AI assistants. Search and AI crawlers are welcome on all public
          pages.
        </p>
      </div>
    </div>
  );
}
