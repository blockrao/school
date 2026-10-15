import type { Metadata } from "next";
import Link from "next/link";
import { localeAlternates, localeCanonical } from "@/lib/seo";
import { localePrefix } from "@/lib/urls";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Contact SchoolOye — SchoolOye",
    description: "How to reach SchoolOye: corrections, school claims, partnerships and grievances.",
    alternates: {
      canonical: localeCanonical(locale, "/contact"),
      languages: localeAlternates("/contact"),
    },
  };
}

export default async function Page({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  const prefix = localePrefix(locale);
  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Contact SchoolOye</h1>
      <div className="mt-6 flex flex-col gap-4 text-body">
        <p>
          For corrections to a school page, questions about your data, or any complaint, write to{" "}
          <a href="mailto:grievance@schooloye.in" className="font-semibold text-ruled-blue">
            grievance@schooloye.in
          </a>
          .
        </p>
        <p>
          If you run a school, you can{" "}
          <Link href="/for-schools" className="font-semibold text-ruled-blue">
            claim your page for free
          </Link>{" "}
          and manage it yourself.
        </p>
        <p>
          Parents with a question for a particular school should use the enquiry form on that
          school's page, so the school can reply to you directly.
        </p>
      </div>
    </div>
  );
}
