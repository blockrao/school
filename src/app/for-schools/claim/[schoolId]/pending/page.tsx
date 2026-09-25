import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Claim submitted — SchoolOye", robots: { index: false, follow: false } };
}

export default async function ClaimPendingPage({
  params,
}: PageProps<"/for-schools/claim/[schoolId]/pending">) {
  const { schoolId } = await params;
  const school = (await listPublicSchoolsByIds([schoolId])).at(0);
  if (!school) notFound();

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Claim submitted</h1>
      <p className="mt-2 text-body text-muted-ink">
        We're checking your claim for{" "}
        <span className="font-semibold text-ink">{school.name_en ?? "this school"}</span>. We'll
        confirm once it's verified — usually within a working day.
      </p>
      <Link
        href={`/en/school/${school.id}-${school.slug}`}
        className="mt-6 inline-flex h-12 items-center rounded-md border border-ruled-blue px-5 font-semibold text-ruled-blue"
      >
        View school page
      </Link>
    </div>
  );
}
