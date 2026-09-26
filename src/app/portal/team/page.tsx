import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/state-message";
import { requireSchoolMember } from "@/lib/db/portal-auth";
import { listSchoolAffiliations } from "@/lib/db/school-team";
import { searchPublicTeachersByName } from "@/lib/db/teachers";
import {
  acceptTeacherRequest,
  cancelInvite,
  declineTeacherRequest,
  inviteTeacher,
  removeTeamMember,
} from "./actions";

export const metadata: Metadata = {
  title: "Team — SchoolOye portal",
  robots: { index: false, follow: false },
};

const ERROR_COPY: Record<string, string> = {
  invalid: "That teacher couldn't be found.",
  already_pending: "There's already an active or pending relationship with that teacher.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PortalTeamPage({ searchParams }: PageProps<"/portal/team">) {
  const rawSearchParams = await searchParams;
  const q = first(rawSearchParams.q) ?? "";
  const errorCode = first(rawSearchParams.error);

  const { membership } = await requireSchoolMember();
  const [{ active, invitesSent, requestsReceived }, searchResults] = await Promise.all([
    listSchoolAffiliations(membership.schoolId),
    searchPublicTeachersByName(q),
  ]);

  const affiliatedTeacherIds = new Set([
    ...active.map((a) => a.teacherId),
    ...invitesSent.map((a) => a.teacherId),
  ]);

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <Link href="/portal" className="text-meta font-semibold text-ruled-blue">
        ← Dashboard
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">Your team</h1>
      <p className="mt-1 text-body text-muted-ink">
        Invite teachers who already have a SchoolOye profile onto your published team — this is also
        how you meet the requirement to list your teaching staff.
      </p>

      {errorCode && ERROR_COPY[errorCode] && (
        <p className="mt-4 rounded-md border border-pill-closed-bd bg-pill-closed-bg px-3 py-2 text-meta">
          {ERROR_COPY[errorCode]}
        </p>
      )}

      {requestsReceived.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-card font-semibold">Requests to join</h2>
          <div className="mt-2 flex flex-col gap-2">
            {requestsReceived.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-copy-white p-3"
              >
                <span className="font-semibold">{r.teacherName}</span>
                <div className="flex gap-2">
                  <form action={acceptTeacherRequest}>
                    <input type="hidden" name="affiliationId" value={r.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-ruled-blue px-3 py-1.5 text-meta font-semibold text-copy-white"
                    >
                      Accept
                    </button>
                  </form>
                  <form action={declineTeacherRequest}>
                    <input type="hidden" name="affiliationId" value={r.id} />
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

      <div className="mt-6">
        <h2 className="font-display text-card font-semibold">Invite a teacher</h2>
        <form className="mt-2 flex gap-2" action="/portal/team">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search teachers by name"
            className="h-11 w-full max-w-sm rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
          <button
            type="submit"
            className="flex h-11 shrink-0 items-center rounded-md border border-ruled-blue px-4 font-semibold text-ruled-blue"
          >
            Search
          </button>
        </form>

        {q && (
          <div className="mt-3 flex flex-col gap-2">
            {searchResults.length === 0 ? (
              <p className="text-meta text-muted-ink">No teacher profiles match "{q}".</p>
            ) : (
              searchResults.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-copy-white p-3"
                >
                  <div>
                    <span className="font-semibold">{t.full_name}</span>
                    <span className="ml-2 text-meta text-muted-ink">
                      {[t.subject, t.level].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {affiliatedTeacherIds.has(t.id) ? (
                    <span className="text-meta text-muted-ink">Already invited / on team</span>
                  ) : (
                    <form action={inviteTeacher}>
                      <input type="hidden" name="teacherId" value={t.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-ruled-blue px-3 py-1.5 text-meta font-semibold text-copy-white"
                      >
                        Invite
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {invitesSent.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-card font-semibold">Invites awaiting response</h2>
          <div className="mt-2 flex flex-col gap-2">
            {invitesSent.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-copy-white p-3"
              >
                <span className="font-semibold">{inv.teacherName}</span>
                <form action={cancelInvite}>
                  <input type="hidden" name="affiliationId" value={inv.id} />
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

      <div className="mt-6">
        <h2 className="font-display text-card font-semibold">Your team</h2>
        {active.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title="No team members yet"
              description="Invite a teacher above, or wait for one to request to join."
              nextStepLabel="Back to dashboard"
              nextStepHref="/portal"
            />
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {active.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-copy-white p-3"
              >
                <div>
                  <Link
                    href={`/en/teacher/${member.teacherId}-${member.teacherSlug}`}
                    className="font-semibold text-ruled-blue"
                  >
                    {member.teacherName}
                  </Link>
                  {member.subject && (
                    <span className="ml-2 text-meta text-muted-ink">{member.subject}</span>
                  )}
                </div>
                <form action={removeTeamMember}>
                  <input type="hidden" name="affiliationId" value={member.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-ink px-3 py-1.5 text-meta font-semibold"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
