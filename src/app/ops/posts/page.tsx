import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import {
  approvePost,
  approvePostListing,
  grantPostTier,
  rejectPost,
  rejectPostListing,
} from "./actions";

export const metadata: Metadata = {
  title: "School news & PR — SchoolOye ops",
  robots: { index: false, follow: false },
};

const TIER_LABEL: Record<string, string> = {
  featured: "Featured post",
  press_release: "Press release",
};

export default async function OpsPostsPage() {
  const { supabase } = await requireStaff();

  const [{ data: posts }, { data: listingRequests }, { data: tierRequests }] = await Promise.all([
    // Base moderation queue: rare now that organic posts auto-approve on
    // submission (SEO/GEO follow-up, 29 Sep 2026) — mostly for staff-created
    // rows or a post flagged back to pending after the fact.
    supabase
      .from("school_posts")
      .select("id, school_id, kind, title, body, source_url, created_at")
      .eq("review", "pending")
      .order("created_at", { ascending: true }),
    // The real day-to-day queue now: schools asking for a spot on /news.
    // P1.5: includes 'edited' — see the matching comment in ops/events/page.tsx.
    supabase
      .from("school_posts")
      .select("id, school_id, kind, title, body, source_url, tier, created_at")
      .in("listing_review", ["pending", "edited"])
      .order("created_at", { ascending: true }),
    // Sales-mediated: a school expressed interest in a paid tier.
    supabase
      .from("school_posts")
      .select("id, school_id, kind, title, requested_tier, created_at")
      .not("requested_tier", "is", null)
      .eq("tier", "organic")
      .order("created_at", { ascending: true }),
  ]);

  const schoolIds = [
    ...new Set(
      [...(posts ?? []), ...(listingRequests ?? []), ...(tierRequests ?? [])].map(
        (p) => p.school_id,
      ),
    ),
  ];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">School news & PR</h1>
      <p className="mt-1 text-body text-muted-ink">News and press updates submitted by schools.</p>

      <section className="mt-6">
        <h2 className="font-display text-card font-semibold">
          Listing requests — /news aggregator
        </h2>
        <p className="mt-1 text-body text-muted-ink">
          Already live on the school's own page; approving adds it to the public /news feed.
        </p>
        {!listingRequests || listingRequests.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Nothing pending"
              description="No schools are currently waiting on a /news listing decision."
              nextStepLabel="Back to ops"
              nextStepHref="/ops"
            />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {listingRequests.map((post) => (
              <div key={post.id} className="rounded-md border border-rule bg-copy-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-meta font-semibold text-muted-ink capitalize">
                      {schoolNameById.get(post.school_id) ?? post.school_id} · {post.kind}
                      {post.tier !== "organic" ? ` · ${TIER_LABEL[post.tier] ?? post.tier}` : ""}
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
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <form action={approvePostListing}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button
                        type="submit"
                        className="flex h-10 w-full items-center justify-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                      >
                        Approve listing
                      </button>
                    </form>
                    <form action={rejectPostListing} className="flex flex-col gap-1.5">
                      <textarea
                        name="reason"
                        required
                        rows={2}
                        placeholder="Reason for rejection (shown to the school)"
                        className="w-56 rounded-md border border-line-blue-strong bg-copy-white p-2 text-meta outline-none"
                      />
                      <input type="hidden" name="postId" value={post.id} />
                      <button
                        type="submit"
                        className="flex h-10 items-center justify-center rounded-md border border-ink px-3 text-meta font-semibold"
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
      </section>

      <section className="mt-8">
        <h2 className="font-display text-card font-semibold">Featured / press release requests</h2>
        <p className="mt-1 text-body text-muted-ink">
          A school asked for a paid tier. Grant it once the commercial side is confirmed.
        </p>
        {!tierRequests || tierRequests.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No requests"
              description="No schools have asked for a featured post or press release."
              nextStepLabel="Back to ops"
              nextStepHref="/ops"
            />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {tierRequests.map((post) => (
              <div key={post.id} className="rounded-md border border-rule bg-copy-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-meta font-semibold text-muted-ink">
                      {schoolNameById.get(post.school_id) ?? post.school_id} · requesting{" "}
                      {TIER_LABEL[post.requested_tier ?? ""] ?? post.requested_tier}
                    </span>
                    <h2 className="font-display text-card font-semibold">{post.title}</h2>
                  </div>
                  <form action={grantPostTier}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="tier" value={post.requested_tier ?? ""} />
                    <button
                      type="submit"
                      className="flex h-10 shrink-0 items-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                    >
                      Grant {TIER_LABEL[post.requested_tier ?? ""] ?? post.requested_tier}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-card font-semibold">Base review queue</h2>
        <p className="mt-1 text-body text-muted-ink">
          Rare now — organic posts publish to the school's own page immediately.
        </p>
        {!posts || posts.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Nothing pending"
              description="No school news or PR posts are currently awaiting review."
              nextStepLabel="Back to ops"
              nextStepHref="/ops"
            />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
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
      </section>
    </div>
  );
}
