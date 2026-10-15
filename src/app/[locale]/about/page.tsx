import type { Metadata } from "next";
import Link from "next/link";
import { localeAlternates, localeCanonical } from "@/lib/seo";
import { localePrefix } from "@/lib/urls";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "About SchoolOye — SchoolOye",
    description:
      "SchoolOye is a school discovery and admissions-information directory for India. What it is, what it does not do, and how it is run.",
    alternates: {
      canonical: localeCanonical(locale, "/about"),
      languages: localeAlternates("/about"),
    },
  };
}

export default async function Page({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  const prefix = localePrefix(locale);
  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">About SchoolOye</h1>
      <div className="mt-6 flex flex-col gap-4 text-body">
        <p>
          SchoolOye is a school discovery and admissions-information directory for India. Every
          school has one page that gathers its board affiliation, grades, location and admission
          status, so a parent can compare schools without visiting a dozen websites.
        </p>
        <h2 className="font-display text-card font-semibold">What we do not do</h2>
        <ul className="list-disc pl-6">
          <li>We do not sell rankings or star ratings. Schools cannot pay to move up a list.</li>
          <li>Any sponsored placement is labelled as sponsored wherever it appears.</li>
          <li>
            We do not publish parents' contact details. A question to a school goes through the
            enquiry form on that school's page.
          </li>
          <li>We do not guess. A fact we do not have is shown as not yet published.</li>
        </ul>
        <h2 className="font-display text-card font-semibold">For schools</h2>
        <p>
          Schools can claim their page for free to correct facts, post news, events and admission
          dates, and answer parents directly.{" "}
          <Link href="/for-schools" className="font-semibold text-ruled-blue">
            Claim your school
          </Link>
          .
        </p>
        <h2 className="font-display text-card font-semibold">More</h2>
        <p>
          Read{" "}
          <Link href={`${prefix}/methodology`} className="font-semibold text-ruled-blue">
            how we collect and verify facts
          </Link>
          , or{" "}
          <Link href={`${prefix}/contact`} className="font-semibold text-ruled-blue">
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
