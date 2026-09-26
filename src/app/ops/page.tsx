import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/db/ops";
import { getOpsCounts } from "@/lib/db/ops-dashboard";

export const metadata: Metadata = {
  title: "Ops — SchoolOye",
  robots: { index: false, follow: false },
};

function queueCard(href: string, label: string, description: string, count?: number) {
  return (
    <Link
      key={href}
      href={href}
      className="flex flex-col gap-1 rounded-md border border-rule bg-copy-white p-4 hover:border-ruled-blue"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-card font-semibold">{label}</span>
        {count !== undefined && count > 0 ? (
          <span className="rounded-full bg-ruled-blue px-2 py-0.5 text-meta font-semibold text-copy-white">
            {count}
          </span>
        ) : null}
      </div>
      <span className="text-meta text-muted-ink">{description}</span>
    </Link>
  );
}

export default async function OpsHomePage() {
  await requireStaff();
  const counts = await getOpsCounts();

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Ops</h1>
      <p className="mt-1 text-body text-muted-ink">
        {counts.myOpenTasks > 0
          ? `${counts.myOpenTasks} task${counts.myOpenTasks === 1 ? "" : "s"} assigned to you.`
          : "Review queues and school ops."}
      </p>

      <h2 className="mt-8 font-display text-card font-semibold text-muted-ink">Ops workflow</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {queueCard(
          "/ops/tasks",
          "Tasks",
          "Assignable follow-ups and ad-hoc work tied to a school.",
          counts.openTasks,
        )}
        {queueCard("/ops/staff", "Staff", "Who has ops or admin access.")}
        {queueCard("/ops/audit", "Audit log", "Every change to a privilege-bearing table.")}
      </div>

      <h2 className="mt-8 font-display text-card font-semibold text-muted-ink">Review queues</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {queueCard(
          "/ops/schools",
          "Schools — verification & publish",
          "Search any school, confirm its facts, and publish it.",
          counts.schoolsUnverified,
        )}
        {queueCard(
          "/ops/localities",
          "Locality assignments",
          "Schools with no locality assigned yet.",
          counts.localities,
        )}
        {queueCard(
          "/ops/claims",
          "School claims",
          "Verify and approve schools claiming their page.",
          counts.claims,
        )}
        {queueCard(
          "/ops/notices",
          "Admission notices",
          "Review notices submitted by school portals.",
          counts.notices,
        )}
        {queueCard(
          "/ops/seats",
          "Seat status reports",
          "Confirm self-reported seat status before it goes public.",
          counts.seats,
        )}
        {queueCard(
          "/ops/corrections",
          "Correction requests",
          "Profile-field edits requested from a school portal.",
          counts.corrections,
        )}
        {queueCard(
          "/ops/orders",
          "Application Help orders",
          "Confirm payment on manual-provider orders.",
        )}
      </div>
    </div>
  );
}
