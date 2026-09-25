import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import {
  getPublicDistrictBySlug,
  listPublicLocalitiesByCity,
  listPublicSchoolsByDistrict,
} from "@/lib/db/public-adapter";
import { createSessionClient } from "@/lib/db/session";
import { getMyTeacherProfile } from "@/lib/db/teachers";
import { saveTeacherProfile } from "./actions";

const DISTRICT_SLUG = "jaipur";
const OPEN_TO_OPTIONS = ["Tutoring", "Online classes", "Teacher workshops"] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Create your teacher profile — SchoolOye",
  robots: { index: false, follow: false },
};

export default async function CreateTeacherProfilePage({
  params,
  searchParams,
}: PageProps<"/[locale]/teachers/create">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/teachers/create`)}`);
  }

  const [existing, district] = await Promise.all([
    getMyTeacherProfile(),
    getPublicDistrictBySlug(DISTRICT_SLUG),
  ]);

  if (existing) {
    redirect(`/${locale}/teacher/${existing.id}-${existing.slug}/manage`);
  }

  const [{ schools }, localities] = await Promise.all([
    district
      ? listPublicSchoolsByDistrict(district.id, { pageSize: 100 })
      : Promise.resolve({ schools: [] }),
    listPublicLocalitiesByCity(DISTRICT_SLUG, 0),
  ]);

  const errorCode = first(rawSearchParams.error);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Create your teacher profile</h1>
      <p className="mt-1 text-body text-muted-ink">
        Free. You choose what's public, and parents contact you only through SchoolOye.
      </p>

      <form action={saveTeacherProfile} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Full name</span>
          <input
            type="text"
            name="fullName"
            required
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Subject</span>
            <input
              type="text"
              name="subject"
              required
              placeholder="Mathematics"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Level</span>
            <select
              name="level"
              defaultValue="TGT"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            >
              <option value="PRT">PRT (Primary)</option>
              <option value="TGT">TGT (Middle)</option>
              <option value="PGT">PGT (Senior)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">School</span>
            <select
              name="primarySchoolId"
              defaultValue=""
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            >
              <option value="">Not listed / self-employed</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_en ?? "Name not yet published"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Locality</span>
            <select
              name="localityId"
              defaultValue=""
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            >
              <option value="">Select</option>
              {localities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Years teaching</span>
            <input
              type="number"
              name="yearsTeaching"
              min={0}
              max={60}
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Headline (one line, shown in the directory)
          </span>
          <input
            type="text"
            name="headline"
            maxLength={200}
            placeholder="Students map their own neighbourhood to scale to learn ratios."
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">About your teaching</span>
          <textarea
            name="about"
            rows={4}
            maxLength={2000}
            className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
          />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-meta font-semibold text-muted-ink">Open to</legend>
          <div className="flex flex-wrap gap-2">
            {OPEN_TO_OPTIONS.map((o) => (
              <label
                key={o}
                className="flex h-10 items-center gap-2 rounded-full border border-line-blue px-3 text-meta has-[:checked]:border-ruled-blue has-[:checked]:bg-pill-results-bg"
              >
                <input type="checkbox" name={`openTo_${o}`} className="h-3.5 w-3.5" />
                {o}
              </label>
            ))}
          </div>
        </fieldset>

        {errorCode && (
          <FieldError id="teacher-error">
            {errorCode === "invalid"
              ? "Check the required fields."
              : "Something went wrong. Please try again."}
          </FieldError>
        )}

        <button
          type="submit"
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Create profile
        </button>
      </form>
    </div>
  );
}
