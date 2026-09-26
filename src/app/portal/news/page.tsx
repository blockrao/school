import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/state-message";
import { getMySchoolId, listPostsForSchool } from "@/lib/db/portal";

export const metadata: Metadata = {
  title: "News & PR — SchoolOye portal",
  robots: { index: false, follow: false },
};

const REVIEW_LABEL: Record<string, string> = {
  pending: "Awaiting review",
  approved: "Live",
  edited: "Live (edited)",
  rejected: "Not approved",
  needs_triage: "Awaiting review",
};

const REVIEW_CLASS: Record<string, string> = {
  pending: "border-sponsored-border text-muted-ink",
  approved: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
  edited: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
  rejected: "border-pill-closed-bd bg-pill-closed-bg text-muted-ink",
  needs_triage: "border-sponsored-border text-muted-ink",
};

export default async function SchoolNewsPage() {
  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const posts = await listPostsForSchool(schoolId);

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/portal" className="text-meta font-semibold text-ruled-blue">
            ← Dashboard
          </Link>
          <h1 className="mt-1 font-display text-title-m md:text-title-d">News & PR</h1>
          <p className="mt-1 text-body text-muted-ink">
            Announcements, awards, and press updates from your school.
          </p>
        </div>
        <Link
          href="/portal/news/new"
          className="flex h-11 items-center rounded-md bg-ruled-blue px-4 font-semibold text-copy-white"
        >
          Publish an update
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing published yet"
            description="Share an award, a new campus, or another milestone."
            nextStepLabel="Publish an update"
            nextStepHref="/portal/news/new"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-md border border-rule bg-copy-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-meta font-semibold text-muted-ink capitalize">
                    {post.kind === "press" ? "Press release" : "News"}
                  </span>
                  <h2 className="font-display text-card font-semibold">{post.title}</h2>
                  <p className="mt-1 max-w-2xl whitespace-pre-wrap text-body text-muted-ink">
                    {post.body}
                  </p>
                  <p className="mt-1 text-meta text-muted-ink">
                    {new Date(post.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-meta font-semibold ${
                    REVIEW_CLASS[post.review] ?? ""
                  }`}
                >
                  {REVIEW_LABEL[post.review] ?? post.review}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
