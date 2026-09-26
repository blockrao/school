import type { Metadata } from "next";
import Link from "next/link";
import { NotYetPublished } from "@/components/ui/freshness-line";
import { EmptyState } from "@/components/ui/state-message";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardNamesBySchoolId,
  getCitiesByDistrictIds,
  listPublicSchoolsByIds,
} from "@/lib/db/public-adapter";
import { formatGradeRange } from "@/lib/grades";
import { istDayMonthLabel } from "@/lib/ist-date";
import { schoolPath } from "@/lib/school-url";

const COMPARE_LIMIT = 4;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Compare schools — SchoolOye",
  description: "Compare fees, facilities and admission dates side by side.",
  robots: { index: false, follow: true },
};

export default async function ComparePage({
  params,
  searchParams,
}: PageProps<"/[locale]/compare">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const ids = (first(rawSearchParams.ids) || "").split(",").filter(Boolean).slice(0, COMPARE_LIMIT);

  const schools = await listPublicSchoolsByIds(ids);
  // Preserve the URL's order (selection order), not whatever the query returned.
  const orderedSchools = ids.flatMap((id) => {
    const school = schools.find((s) => s.id === id);
    return school ? [school] : [];
  });

  const schoolIds = orderedSchools.map((s) => s.id);
  const districtIds = orderedSchools.flatMap((s) => (s.district_id != null ? [s.district_id] : []));
  const [boardNames, admissionDeadlines, citiesByDistrict] = await Promise.all([
    getBoardNamesBySchoolId(schoolIds),
    getAdmissionDeadlinesBySchoolId(schoolIds),
    getCitiesByDistrictIds(districtIds),
  ]);

  function hrefFor(school: (typeof orderedSchools)[number]): string {
    const city = school.district_id != null ? citiesByDistrict.get(school.district_id) : undefined;
    return city ? schoolPath(locale, city.slug, school) : `/${locale}/schools`;
  }

  if (orderedSchools.length === 0) {
    return (
      <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
        <h1 className="font-display text-title-m md:text-title-d">Compare schools</h1>
        <div className="mt-6">
          <EmptyState
            title="No schools selected"
            description="Pick up to 4 schools from search results to compare them side by side."
            nextStepLabel="Browse schools"
            nextStepHref={`/${locale}/schools`}
          />
        </div>
      </div>
    );
  }

  const rows: {
    label: string;
    render: (school: (typeof orderedSchools)[number]) => React.ReactNode;
  }[] = [
    { label: "Board", render: (s) => boardNames.get(s.id) ?? <NotYetPublished /> },
    { label: "Grades", render: (s) => formatGradeRange(s.min_class, s.max_class) },
    { label: "Management", render: (s) => s.management ?? <NotYetPublished /> },
    { label: "Gender", render: (s) => s.gender ?? <NotYetPublished /> },
    {
      label: "Medium",
      render: (s) => (s.medium && s.medium.length > 0 ? s.medium.join(", ") : <NotYetPublished />),
    },
    { label: "Fee range", render: () => <NotYetPublished /> },
    {
      label: "Admission deadline",
      render: (s) => {
        const closesOn = admissionDeadlines.get(s.id);
        if (!closesOn) return "Dates not announced";
        const { day, month } = istDayMonthLabel(new Date(closesOn));
        return `${day} ${month}`;
      },
    },
    {
      label: "Website",
      render: (s) =>
        s.website ? (
          <a
            href={s.website}
            className="font-semibold text-ruled-blue"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {s.website.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <NotYetPublished />
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Compare schools</h1>
      <p className="mt-1 text-body text-muted-ink">
        {orderedSchools.length} school{orderedSchools.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-3xl border-collapse text-body">
          <thead>
            <tr>
              <th className="w-40 border-b border-rule py-3 pr-3 text-left text-meta font-semibold text-muted-ink">
                &nbsp;
              </th>
              {orderedSchools.map((school) => (
                <th key={school.id} className="border-b border-rule p-3 text-left align-top">
                  <Link
                    href={hrefFor(school)}
                    className="font-display font-semibold text-ink hover:text-ruled-blue"
                  >
                    {school.name_en ?? "Name not yet published"}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="border-b border-rule-soft py-3 pr-3 text-left text-meta font-semibold text-muted-ink">
                  {row.label}
                </th>
                {orderedSchools.map((school) => (
                  <td key={school.id} className="border-b border-rule-soft p-3">
                    {row.render(school)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
