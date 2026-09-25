import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/db/ops";

export const metadata: Metadata = {
  title: "Ops — SchoolOye",
  robots: { index: false, follow: false },
};

const QUEUES = [
  {
    href: "/ops/localities",
    label: "Locality assignments",
    description: "Schools with no locality assigned yet.",
  },
  {
    href: "/ops/claims",
    label: "School claims",
    description: "Verify and approve schools claiming their page.",
  },
  {
    href: "/ops/notices",
    label: "Admission notices",
    description: "Review notices submitted by school portals.",
  },
  {
    href: "/ops/seats",
    label: "Seat status reports",
    description: "Confirm self-reported seat status before it goes public.",
  },
  {
    href: "/ops/corrections",
    label: "Correction requests",
    description: "Profile-field edits requested from a school portal.",
  },
  {
    href: "/ops/orders",
    label: "Application Help orders",
    description: "Confirm payment on manual-provider orders.",
  },
] as const;

export default async function OpsHomePage() {
  await requireStaff();

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Ops</h1>
      <p className="mt-1 text-body text-muted-ink">Review queues.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUEUES.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="flex flex-col gap-1 rounded-md border border-rule bg-copy-white p-4 hover:border-ruled-blue"
          >
            <span className="font-display text-card font-semibold">{q.label}</span>
            <span className="text-meta text-muted-ink">{q.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
