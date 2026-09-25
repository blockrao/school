import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getPublicDistrictBySlug, listPublicSchoolsByDistrict } from "@/lib/db/public-adapter";
import { createSessionClient } from "@/lib/db/session";
import { listMyTeacherExperience, listMyTeacherQualifications } from "@/lib/db/teachers";
import { addExperience, addQualification, toggleListed } from "./actions";

const DISTRICT_SLUG = "jaipur";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseIdSlug(idSlug: string): { id: string; slug: string } | null {
  if (idSlug.length < 38 || idSlug[36] !== "-") return null;
  const id = idSlug.slice(0, 36);
  if (!UUID_RE.test(id)) return null;
  return { id, slug: idSlug.slice(37) };
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Manage your profile — SchoolOye", robots: { index: false, follow: false } };
}

export default async function ManageTeacherProfilePage({
  params,
  searchParams,
}: PageProps<"/[locale]/teacher/[idSlug]/manage">) {
  const { locale, idSlug } = await params;
  const rawSearchParams = await searchParams;
  const parsed = parseIdSlug(idSlug);
  if (!parsed) notFound();

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/teacher/${idSlug}/manage`)}`,
    );
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, slug, full_name, is_listed, status")
    .eq("id", parsed.id)
    .eq("claimed_by", user.id)
    .maybeSingle();
  if (!teacher) notFound();

  const canonicalIdSlug = `${teacher.id}-${teacher.slug}`;

  const district = await getPublicDistrictBySlug(DISTRICT_SLUG);
  const [experience, qualifications, { schools }] = await Promise.all([
    listMyTeacherExperience(teacher.id),
    listMyTeacherQualifications(teacher.id),
    district
      ? listPublicSchoolsByDistrict(district.id, { pageSize: 100 })
      : Promise.resolve({ schools: [] }),
  ]);

  const errorCode = first(rawSearchParams.error);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-title-m md:text-title-d">Manage your profile</h1>
        <Link
          href={`/${locale}/teacher/${canonicalIdSlug}`}
          className="font-semibold text-ruled-blue"
        >
          View public profile
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-rule bg-copy-white p-3.5">
        <div>
          <span className="font-semibold">
            {teacher.is_listed ? "Listed in directory" : "Not listed"}
          </span>
          <p className="text-meta text-muted-ink">
            {teacher.is_listed
              ? "Parents can find you by name, subject or school."
              : "Your profile page still works, but you won't appear in search or the directory."}
          </p>
        </div>
        <form action={toggleListed}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="teacherId" value={teacher.id} />
          <input type="hidden" name="idSlug" value={canonicalIdSlug} />
          <input type="hidden" name="isListed" value={teacher.is_listed ? "1" : "0"} />
          <button
            type="submit"
            className="flex h-10 shrink-0 items-center rounded-md border border-ruled-blue px-3 text-meta font-semibold text-ruled-blue"
          >
            {teacher.is_listed ? "Unlist" : "List me"}
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-6">
        <div className="rounded-md border border-rule bg-copy-white p-4">
          <h2 className="font-display text-card font-semibold">Experience</h2>
          {experience.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {experience.map((e) => (
                <li key={e.id} className="text-body">
                  <span className="font-semibold">
                    {e.start_year}–{e.end_year ?? "now"}
                  </span>{" "}
                  {e.role_title}
                  {e.school_text ? `, ${e.school_text}` : ""}
                </li>
              ))}
            </ul>
          )}
          <form action={addExperience} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="teacherId" value={teacher.id} />
            <input type="hidden" name="idSlug" value={canonicalIdSlug} />
            <input
              type="text"
              name="roleTitle"
              placeholder="Role (e.g. TGT Mathematics)"
              required
              className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-meta outline-none"
            />
            <select
              name="schoolId"
              defaultValue=""
              className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-meta outline-none"
            >
              <option value="">Not listed / self-employed</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_en ?? "Name not yet published"}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="schoolText"
              placeholder="Or type a name (used only if no school selected)"
              className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-meta outline-none"
            />
            <div className="flex gap-2">
              <input
                type="number"
                name="startYear"
                placeholder="Start year"
                required
                min={1970}
                max={2100}
                className="h-11 w-full rounded-md border border-line-blue-strong bg-copy-white px-3 text-meta outline-none"
              />
              <input
                type="number"
                name="endYear"
                placeholder="End year (blank = current)"
                min={1970}
                max={2100}
                className="h-11 w-full rounded-md border border-line-blue-strong bg-copy-white px-3 text-meta outline-none"
              />
            </div>
            {errorCode === "invalid_experience" && (
              <FieldError id="exp-error">Check the fields above.</FieldError>
            )}
            <button
              type="submit"
              className="flex h-10 w-fit items-center rounded-md bg-ruled-blue px-4 text-meta font-semibold text-copy-white"
            >
              Add experience
            </button>
          </form>
        </div>

        <div className="rounded-md border border-rule bg-copy-white p-4">
          <h2 className="font-display text-card font-semibold">Qualifications</h2>
          {qualifications.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {qualifications.map((q) => (
                <li key={q.id} className="text-body">
                  <span className="font-semibold">{q.title}</span>
                  {q.detail ? ` — ${q.detail}` : ""}{" "}
                  <span className="text-meta text-muted-ink">
                    {q.verified_at ? "· Verified" : "· Not checked yet"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={addQualification} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="teacherId" value={teacher.id} />
            <input type="hidden" name="idSlug" value={canonicalIdSlug} />
            <input
              type="text"
              name="title"
              placeholder="e.g. M.Sc. Mathematics"
              required
              className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-meta outline-none"
            />
            <input
              type="text"
              name="detail"
              placeholder="Institution and year"
              className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-meta outline-none"
            />
            {errorCode === "invalid_qualification" && (
              <FieldError id="qual-error">Enter a title.</FieldError>
            )}
            <button
              type="submit"
              className="flex h-10 w-fit items-center rounded-md bg-ruled-blue px-4 text-meta font-semibold text-copy-white"
            >
              Add qualification
            </button>
          </form>
          <p className="mt-3 text-meta text-muted-ink">
            SchoolOye checks qualifications before marking them verified.
          </p>
        </div>
      </div>
    </div>
  );
}
