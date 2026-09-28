import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import {
  getSelectedCityArea,
  listPublicSchoolsByDistrict,
  searchPublicSchoolsByName,
} from "@/lib/db/public-adapter";
import { listTeacherAffiliations } from "@/lib/db/school-team";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { listMyTeacherExperience, listMyTeacherQualifications } from "@/lib/db/teachers";
import { siteUrl } from "@/lib/env.server";
import { localePrefix, parseTeacherCode, teacherPath } from "@/lib/urls";
import {
  acceptSchoolInvite,
  addExperience,
  addQualification,
  cancelSchoolRequest,
  declineSchoolInvite,
  leaveSchool,
  requestSchool,
  toggleListed,
} from "./actions";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Manage your profile — SchoolOye", robots: { index: false, follow: false } };
}

export default async function ManageTeacherProfilePage({
  params,
  searchParams,
}: PageProps<"/[locale]/teacher/[slug]/manage">) {
  const { locale, slug: idSlug } = await params;
  const rawSearchParams = await searchParams;
  const code = parseTeacherCode(idSlug);
  if (code === null) notFound();

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(
      `${localePrefix(locale)}/sign-in?next=${encodeURIComponent(`${localePrefix(locale)}/teacher/${idSlug}/manage`)}`,
    );
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, slug, teacher_code, full_name, is_listed, status")
    .eq("teacher_code", code)
    .eq("claimed_by", user.id)
    .maybeSingle();
  if (!teacher) notFound();

  const canonicalIdSlug = teacher.slug;
  const publicUrl = `${siteUrl}${teacherPath("en", teacher.slug)}`;

  const area = await getSelectedCityArea();
  const schoolQuery = first(rawSearchParams.school_q) ?? "";
  const [experience, qualifications, { schools }, teacherSchools, schoolSearchResults] =
    await Promise.all([
      listMyTeacherExperience(teacher.id),
      listMyTeacherQualifications(teacher.id),
      area
        ? listPublicSchoolsByDistrict(area.districtIds, { pageSize: 100 })
        : Promise.resolve({ schools: [] }),
      listTeacherAffiliations(teacher.id),
      searchPublicSchoolsByName(schoolQuery),
    ]);

  const errorCode = first(rawSearchParams.error);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-title-m md:text-title-d">Manage your profile</h1>
        <Link href={teacherPath(locale, canonicalIdSlug)} className="font-semibold text-ruled-blue">
          View public profile
        </Link>
      </div>

      <section
        aria-labelledby="public-url-heading"
        className="mt-5 flex flex-col gap-1 rounded-md border border-rule bg-margin-paper p-4"
      >
        {first(rawSearchParams.welcome) === "1" && (
          <p className="font-display text-card font-semibold text-ink">
            You're registered. Here is your public profile URL:
          </p>
        )}
        <h2 id="public-url-heading" className="text-meta font-semibold text-muted-ink">
          Your public profile URL
        </h2>
        <a
          href={teacherPath(locale, canonicalIdSlug)}
          className="break-all font-semibold text-ruled-blue"
        >
          {publicUrl}
        </a>
        <p className="text-meta text-muted-ink">
          Your SchoolOye teacher ID is{" "}
          <span className="font-semibold text-ink">{teacher.teacher_code}</span>. Share this link on
          your CV, WhatsApp or social profiles. It stays the same for good; if you correct your
          name, the old link forwards here.
        </p>
      </section>

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

      <div className="mt-6 rounded-md border border-rule bg-copy-white p-4">
        <h2 className="font-display text-card font-semibold">Schools</h2>
        <p className="mt-1 text-meta text-muted-ink">
          A school can invite you onto its published team, or you can request to join one below.
          Either way, the other side has to accept before it shows publicly.
        </p>

        {teacherSchools.invitesReceived.length > 0 && (
          <div className="mt-4">
            <h3 className="text-meta font-semibold text-muted-ink">Invitations</h3>
            <div className="mt-2 flex flex-col gap-2">
              {teacherSchools.invitesReceived.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule-soft p-3"
                >
                  <span className="font-semibold">{inv.schoolName}</span>
                  <div className="flex gap-2">
                    <form action={acceptSchoolInvite}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="teacherId" value={teacher.id} />
                      <input type="hidden" name="idSlug" value={canonicalIdSlug} />
                      <input type="hidden" name="affiliationId" value={inv.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-ruled-blue px-3 py-1.5 text-meta font-semibold text-copy-white"
                      >
                        Accept
                      </button>
                    </form>
                    <form action={declineSchoolInvite}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="teacherId" value={teacher.id} />
                      <input type="hidden" name="idSlug" value={canonicalIdSlug} />
                      <input type="hidden" name="affiliationId" value={inv.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-ink px-3 py-1.5 text-meta font-semibold"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-meta font-semibold text-muted-ink">Request to join a school</h3>
          <form
            className="mt-2 flex gap-2"
            action={`${localePrefix(locale)}/teacher/${canonicalIdSlug}/manage`}
          >
            <input
              type="text"
              name="school_q"
              defaultValue={schoolQuery}
              placeholder="Search schools by name"
              className="h-11 w-full max-w-sm rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
            <button
              type="submit"
              className="flex h-11 shrink-0 items-center rounded-md border border-ruled-blue px-4 font-semibold text-ruled-blue"
            >
              Search
            </button>
          </form>
          {errorCode === "already_pending" && (
            <FieldError id="school-error">
              There's already an active or pending relationship with that school.
            </FieldError>
          )}
          {errorCode === "school_not_found" && (
            <FieldError id="school-error">
              That school isn't published anymore — search again to find a current one.
            </FieldError>
          )}
          {errorCode === "rate_limited" && (
            <FieldError id="school-error">
              Too many requests sent — please wait a bit and try again.
            </FieldError>
          )}
          {errorCode === "request_failed" && (
            <FieldError id="school-error">
              Something went wrong sending that request. Please try again.
            </FieldError>
          )}
          {errorCode === "stale" && (
            <FieldError id="school-error">
              That had already changed — refresh to see its current state.
            </FieldError>
          )}
          {schoolQuery && (
            <div className="mt-3 flex flex-col gap-2">
              {schoolSearchResults.length === 0 ? (
                <p className="text-meta text-muted-ink">No schools match "{schoolQuery}".</p>
              ) : (
                schoolSearchResults.map((s) => {
                  const alreadyLinked =
                    teacherSchools.active.some((a) => a.schoolId === s.id) ||
                    teacherSchools.requestsSent.some((a) => a.schoolId === s.id);
                  return (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule-soft p-3"
                    >
                      <span className="font-semibold">{s.name_en ?? "School"}</span>
                      {alreadyLinked ? (
                        <span className="text-meta text-muted-ink">
                          Already requested / on team
                        </span>
                      ) : (
                        <form action={requestSchool}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="teacherId" value={teacher.id} />
                          <input type="hidden" name="idSlug" value={canonicalIdSlug} />
                          <input type="hidden" name="schoolId" value={s.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-ruled-blue px-3 py-1.5 text-meta font-semibold text-copy-white"
                          >
                            Request to join
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {teacherSchools.requestsSent.length > 0 && (
          <div className="mt-4">
            <h3 className="text-meta font-semibold text-muted-ink">Requests sent</h3>
            <div className="mt-2 flex flex-col gap-2">
              {teacherSchools.requestsSent.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule-soft p-3"
                >
                  <span className="font-semibold">{req.schoolName}</span>
                  <form action={cancelSchoolRequest}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="teacherId" value={teacher.id} />
                    <input type="hidden" name="idSlug" value={canonicalIdSlug} />
                    <input type="hidden" name="affiliationId" value={req.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-ink px-3 py-1.5 text-meta font-semibold"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-meta font-semibold text-muted-ink">Your schools</h3>
          {teacherSchools.active.length === 0 ? (
            <p className="mt-1 text-meta text-muted-ink">Not on any school's published team yet.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {teacherSchools.active.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule-soft p-3"
                >
                  <span className="font-semibold">{member.schoolName}</span>
                  <form action={leaveSchool}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="teacherId" value={teacher.id} />
                    <input type="hidden" name="idSlug" value={canonicalIdSlug} />
                    <input type="hidden" name="affiliationId" value={member.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-ink px-3 py-1.5 text-meta font-semibold"
                    >
                      Leave
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
