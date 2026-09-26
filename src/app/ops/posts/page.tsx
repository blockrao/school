import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { approvePost, rejectPost } from "./actions";

export const metadata: Metadata = {
  title: "School news & PR — SchoolOye ops",
  robots: { index: false, follow: false },
};

export default async function OpsPostsPage() {
  const supabase = await requireStaff();

  const { data: posts } = await supabase
    .from("school_posts")
    .select("id, school_id, kind, title, body, source_url, created_at")
    .eq("review", "pending")
    .order("created_at", { ascending: true });

  const schoolIds = [...new Set((posts ?? []).map((p) => p.school_id))];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">School news & PR</h1>
      <p className="mt-1 text-body text-muted-ink">
        News and press updates submitted by schools, awaiting review.
      </p>

      {!posts || posts.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing pending"
            description="No school news or PR posts are currently awaiting review."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-md border border-rule bg-copy-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-meta font-semibold text-muted-ink capitalize">
                    {schoolNameById.get(post.school_id) ?? post.school_id} · {post.kind}
                  </span>
                  <h2 className="font-display text-card font-semibold">{post.title}</h2>
                  <p className="mt-1 max-w-2xl whitespace-pre-wrap text-body">{post.body}</p>
                  {post.source_url ? (
                    <a
                      href={post.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-meta text-ruled-blue"
                    >
                      {post.source_url}
                    </a>
                  ) : null}
                  <p className="mt-1 text-meta text-muted-ink">
                    {new Date(post.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approvePost}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button
                      type="submit"
                      className="flex h-10 items-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectPost}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button
                      type="submit"
                      className="flex h-10 items-center rounded-md border border-ink px-3 text-meta font-semibold"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
