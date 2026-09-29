import type { Metadata } from "next";
import Link from "next/link";
import { listPublicNews } from "@/lib/db/public-adapter";
import { localeCanonical } from "@/lib/seo";
import { newsPath, newsRootPath } from "@/lib/urls";

const TIER_LABEL: Record<string, string> = {
  organic: "News",
  featured: "Featured",
  press_release: "Press release",
};

export async function generateMetadata({ params }: PageProps<"/[locale]/news">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "School news — SchoolOye",
    description: "Announcements, achievements and press updates from schools.",
    alternates: { canonical: localeCanonical(locale, newsRootPath("en")) },
  };
}

export default async function NewsIndexPage({ params }: PageProps<"/[locale]/news">) {
  const { locale } = await params;
  const posts = await listPublicNews();

  // Featured/press_release first (the paid tiers this feature exists partly
  // to sell), then organic, each newest first.
  const tierRank: Record<string, number> = { featured: 0, press_release: 0, organic: 1 };
  const sorted = [...posts].sort((a, b) => tierRank[a.tier] - tierRank[b.tier]);

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">School news</h1>
      <p className="mt-1 text-body text-muted-ink">
        Announcements, achievements and press updates from schools.
      </p>

      {sorted.length === 0 ? (
        <p className="mt-6 text-body text-muted-ink">No posts listed yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {sorted.map((post) => (
            <Link
              key={post.id}
              href={newsPath(locale, post.post_slug)}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-rule bg-copy-white p-4 hover:border-ruled-blue"
            >
              <div>
                <span className="text-meta font-semibold text-muted-ink capitalize">
                  {post.school_name} · {post.kind}
                </span>
                <h2 className="font-display text-card font-semibold">{post.title}</h2>
                <p className="mt-1 text-meta text-muted-ink">
                  {new Date(post.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </p>
              </div>
              {post.tier !== "organic" && (
                <span className="shrink-0 rounded-full border border-ruled-blue px-3 py-1 text-meta font-semibold text-ruled-blue">
                  {TIER_LABEL[post.tier]}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
