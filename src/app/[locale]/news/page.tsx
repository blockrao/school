import type { Metadata } from "next";
import Link from "next/link";
import { listPublicNews } from "@/lib/db/public-adapter";
import { localeCanonical } from "@/lib/seo";
import { newsPath, newsRootPath } from "@/lib/urls";

// This is a live discovery feed — a post appears here the moment ops
// approves its listing (db/views/101_public_news.sql) — so it can't be
// cached indefinitely (the App Router's default for a page with no dynamic
// function and no revalidate) or a freshly-approved post silently never
// shows up until the next deploy. Same reasoning/window as exams/page.tsx.
export const revalidate = 900;

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
            <article
              key={post.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-rule bg-copy-white p-4 hover:border-ruled-blue"
            >
              <div className="min-w-0 flex-1">
                <span className="text-meta font-semibold text-muted-ink capitalize">
                  {post.school_name} · {post.kind}
                </span>
                <h2 className="font-display text-card font-semibold">
                  <Link href={newsPath(locale, post.post_slug)} className="hover:text-ruled-blue">
                    {post.title}
                  </Link>
                </h2>
                {post.topic === "admission_announcement" && (
                  <span className="mt-1 inline-flex rounded-full border border-rule px-2 py-0.5 text-meta font-semibold text-ruled-blue">
                    Admission announcement
                  </span>
                )}
                {post.topic === "admission_announcement" && (
                  <p className="mt-1 text-meta text-muted-ink">
                    {[
                      post.admission_academic_year
                        ? `Session ${post.admission_academic_year}`
                        : null,
                      post.admission_class_codes.length
                        ? `Classes: ${post.admission_class_codes.map((code) => code.replace(/^c/, "")).join(", ")}`
                        : null,
                      post.admission_opens_on
                        ? `Opens ${new Date(post.admission_opens_on).toLocaleDateString("en-IN")}`
                        : null,
                      post.admission_closes_on
                        ? `Closes ${new Date(post.admission_closes_on).toLocaleDateString("en-IN")}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Dates not provided"}
                  </p>
                )}
                <p className="mt-1 text-meta text-muted-ink">
                  Published{" "}
                  {new Date(post.published_at).toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2">
                {post.topic === "admission_announcement" &&
                  (post.admission_application_url || post.admission_notice_url) && (
                    <a
                      href={
                        post.admission_application_url ?? post.admission_notice_url ?? undefined
                      }
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-meta font-semibold text-ruled-blue underline"
                    >
                      {post.admission_application_url
                        ? "Open application link ↗"
                        : "View notice link ↗"}
                    </a>
                  )}
                {post.tier !== "organic" && (
                  <span className="shrink-0 rounded-full border border-ruled-blue px-3 py-1 text-meta font-semibold text-ruled-blue">
                    {TIER_LABEL[post.tier]}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
