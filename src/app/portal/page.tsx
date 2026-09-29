import type { Metadata } from "next";
import Link from "next/link";
import { nextAcademicYear } from "@/lib/age";
import {
  listClassLevels,
  listEnquiriesForSchool,
  listNoticesForSchool,
  listSeatStatusForSchool,
} from "@/lib/db/portal";
import { requireSchoolMember } from "@/lib/db/portal-auth";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { updateSeatStatus } from "./actions";

// Adapted from design/School Portal.dc.html 18c. Not built: the Insights card
// (page views/saves/followers — no real analytics data exists to show, would be
// fabricated) and the featured-placement upsell card (no checkout flow for it
// exists yet — logged in docs/page-enrichment-backlog.md). Page completeness
// isn't shown either: schools.completeness is 0 for every school in the
// database (unpopulated), so a progress bar built on it would be fake, same
// reasoning as schools.status earlier this session.

function currentSessionLabel(): string {
  const year = nextAcademicYear(new Date());
  return `${year - 1}-${String(year).slice(2)}`;
}

export const metadata: Metadata = {
  title: "Dashboard — SchoolOye portal",
  robots: { index: false, follow: false },
};

export default async function PortalDashboardPage() {
  const {
    membership: { schoolId },
  } = await requireSchoolMember();

  const academicYear = currentSessionLabel();

  // All five of these are independent (only schoolId/academicYear, already
  // in hand) — one round trip's worth of latency instead of five stacked.
  const [schools, classLevels, seatRows, notices, enquiries] = await Promise.all([
    listPublicSchoolsByIds([schoolId]),
    listClassLevels(),
    listSeatStatusForSchool(schoolId, academicYear),
    listNoticesForSchool(schoolId),
    listEnquiriesForSchool(schoolId),
  ]);
  const school = schools.at(0);

  const latestByClass = new Map<string, (typeof seatRows)[number]>();
  for (const row of seatRows) {
    if (!latestByClass.has(row.class_code)) latestByClass.set(row.class_code, row);
  }

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-title-m md:text-title-d">
            {school?.name_en ?? "Your school"}
          </h1>
          <p className="text-body text-muted-ink">{academicYear} session</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/portal/notices/new"
            className="flex h-11 items-center rounded-md bg-ruled-blue px-4 font-semibold text-copy-white"
          >
            Post an admission notice
          </Link>
          <Link
            href="/portal/edit-request"
            className="flex h-11 items-center rounded-md border border-ruled-blue px-4 font-semibold text-ruled-blue"
          >
            Request a profile edit
          </Link>
          <Link
            href="/portal/news"
            className="flex h-11 items-center rounded-md border border-ruled-blue px-4 font-semibold text-ruled-blue"
          >
            News & PR
          </Link>
          <Link
            href="/portal/events"
            className="flex h-11 items-center rounded-md border border-ruled-blue px-4 font-semibold text-ruled-blue"
          >
            Events
          </Link>
          <Link
            href="/portal/team"
            className="flex h-11 items-center rounded-md border border-ruled-blue px-4 font-semibold text-ruled-blue"
          >
            Team
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5 min-w-0">
          <div className="rounded-md border border-rule bg-copy-white">
            <div className="border-b border-rule-soft p-3.5">
              <span className="font-display text-card font-semibold">Seat status</span>
            </div>
            <form action={updateSeatStatus} className="flex flex-col">
              <input type="hidden" name="academicYear" value={academicYear} />
              <div className="grid grid-cols-[140px_1fr_100px] gap-2 border-b border-rule-soft px-3.5 py-2 text-meta text-muted-ink">
                <span>Class</span>
                <span>Status</span>
                <span>Seats</span>
              </div>
              {classLevels.map((level) => {
                const current = latestByClass.get(level.code);
                return (
                  <div
                    key={level.code}
                    className="grid grid-cols-[140px_1fr_100px] items-center gap-2 border-b border-rule-soft px-3.5 py-2"
                  >
                    <span className="font-semibold">{level.label_en}</span>
                    <div className="flex overflow-hidden rounded-md border border-line-blue w-fit">
                      {(["open", "limited", "waitlist", "closed"] as const).map((status) => (
                        <label
                          key={status}
                          className="flex h-9 items-center border-r border-line-blue px-2.5 text-meta capitalize last:border-r-0 has-[:checked]:bg-ruled-blue has-[:checked]:text-copy-white"
                        >
                          <input
                            type="radio"
                            name={`status_${level.code}`}
                            value={status}
                            defaultChecked={(current?.public_status ?? "closed") === status}
                            className="sr-only"
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      name={`count_${level.code}`}
                      defaultValue={current?.range_label ?? ""}
                      placeholder="—"
                      className="h-9 w-full rounded-md border border-line-blue-strong bg-copy-white px-2 text-meta outline-none"
                    />
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-3 p-3.5">
                <span className="text-meta text-muted-ink">
                  Parents see Open as "Seats available", Limited as "Few seats", Closed as "Full".
                  Updates are reviewed before going live.
                </span>
                <button
                  type="submit"
                  className="flex h-11 shrink-0 items-center rounded-md bg-ruled-blue px-4 font-semibold text-copy-white"
                >
                  Save
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-md border border-rule bg-copy-white">
            <div className="border-b border-rule-soft p-3.5">
              <span className="font-display text-card font-semibold">Enquiries</span>
            </div>
            {enquiries.length > 0 ? (
              <ul className="flex flex-col">
                {enquiries.map((e) => (
                  <li key={e.id} className="border-b border-rule-soft p-3.5 last:border-b-0">
                    <p className="text-meta text-muted-ink">
                      {e.class_code ? `Class ${e.class_code.replace("c", "")} · ` : ""}
                      {new Date(e.created_at).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-body">{e.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-3.5 text-body text-muted-ink">No enquiries yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5 min-w-0">
          <div className="rounded-md border border-rule bg-copy-white p-3.5">
            <span className="font-display text-card font-semibold">Admission notices</span>
            {notices.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-2">
                {notices.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-2 text-body">
                    <span className="truncate">
                      {(n.extraction as { session?: string } | null)?.session ?? n.url}
                    </span>
                    <span className="shrink-0 text-meta font-semibold text-muted-ink capitalize">
                      {n.review}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-body text-muted-ink">No notices posted yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
