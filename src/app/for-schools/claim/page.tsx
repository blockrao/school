import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { EmptyState } from "@/components/ui/state-message";
import { getSelectedCityArea, listPublicSchoolsByDistrict } from "@/lib/db/public-adapter";
import { formatGradeRange } from "@/lib/grades";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Find your school — SchoolOye",
  robots: { index: false, follow: false },
};

export default async function ClaimSearchPage({ searchParams }: PageProps<"/for-schools/claim">) {
  const rawSearchParams = await searchParams;
  const q = first(rawSearchParams.q);

  const area = await getSelectedCityArea();
  const { schools } =
    q && area
      ? await listPublicSchoolsByDistrict(area.districtId, { query: q, pageSize: 20 })
      : { schools: [] };

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Find your school</h1>
      <p className="mt-1 text-body text-muted-ink">Search by name to start a claim.</p>

      <Form action="/for-schools/claim" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="School name"
          required
          className="h-12 flex-1 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
        />
        <button
          type="submit"
          className="flex h-12 items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Search
        </button>
      </Form>

      {q && (
        <div className="mt-6">
          {schools.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {schools.map((school) => (
                <li key={school.id}>
                  <Link
                    href={`/for-schools/claim/${school.id}`}
                    className="flex flex-col gap-0.5 rounded-md border border-rule bg-copy-white p-3.5 hover:border-ruled-blue"
                  >
                    <span className="font-display text-card font-semibold">
                      {school.name_en ?? "Name not yet published"}
                    </span>
                    <span className="text-meta text-muted-ink">
                      {formatGradeRange(school.min_class, school.max_class)}
                      {school.locality_name ? ` · ${school.locality_name}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No schools match that name"
              description="Try a different spelling, or contact us if your school isn't listed yet."
              nextStepLabel="Browse all schools"
              nextStepHref="/en/schools"
            />
          )}
        </div>
      )}
    </div>
  );
}
