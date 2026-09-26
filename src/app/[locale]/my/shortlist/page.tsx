import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StatusPill } from "@/components/ui/badges";
import { NotYetPublished } from "@/components/ui/freshness-line";
import { SaveButton } from "@/components/ui/save-button";
import { SchoolCard } from "@/components/ui/school-card";
import { EmptyState } from "@/components/ui/state-message";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardNamesBySchoolId,
  getCitiesByDistrictIds,
  listPublicSchoolsByIds,
} from "@/lib/db/public-adapter";
import { createSessionClient } from "@/lib/db/session";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { formatGradeRange } from "@/lib/grades";
import { schoolPath } from "@/lib/school-url";

// design-pending: no matching file in design/ for a saved-schools list. Built from
// the same SchoolCard grid every other listing page uses.

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/my/shortlist">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: `${locale === "hi" ? "सेव किए स्कूल" : "Saved schools"} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

export default async function ShortlistPage({ params }: PageProps<"/[locale]/my/shortlist">) {
  const { locale } = await params;
  const isHi = locale === "hi";
  const now = new Date();

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/my/shortlist`)}`);
  }

  const { data: rows } = await supabase
    .from("shortlists")
    .select("school_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const schoolIds = (rows ?? []).map((r) => r.school_id);
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  // listPublicSchoolsByIds doesn't preserve order — restore the saved-most-recently-first order.
  const orderedSchools = schoolIds.flatMap((id) => {
    const school = schools.find((s) => s.id === id);
    return school ? [school] : [];
  });

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

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {isHi ? "सेव किए स्कूल" : "Saved schools"}
      </h1>

      {orderedSchools.length > 0 ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {orderedSchools.map((school) => {
            const board = boardNames.get(school.id);
            const grades = formatGradeRange(school.min_class, school.max_class);
            const meta = board ? `${board} · ${grades}` : grades;

            const closesOn = admissionDeadlines.get(school.id);
            const deadline = { closesAt: closesOn ? new Date(closesOn) : null };
            const pill = deadlineToPill(deadlineState(deadline, now));

            return (
              <SchoolCard
                key={school.id}
                href={hrefFor(school)}
                name={school.name_en ?? "Name not yet published"}
                meta={meta}
                now={now}
                deadline={deadline}
                status={<StatusPill status={pill.status}>{pill.label}</StatusPill>}
                fee="Not yet published"
                freshness={<NotYetPublished />}
                actions={
                  <SaveButton schoolId={school.id} saved locale={locale} labelSaved="Remove" />
                }
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title={isHi ? "अभी कोई स्कूल सेव नहीं है" : "No saved schools yet"}
            description={
              isHi
                ? 'स्कूल खोजते समय "Save" दबाकर उन्हें यहां इकट्ठा करें।'
                : "Save schools while browsing to compare them here later."
            }
            nextStepLabel={isHi ? "स्कूल खोजें" : "Browse schools"}
            nextStepHref={`/${locale}/schools`}
          />
        </div>
      )}
    </div>
  );
}
