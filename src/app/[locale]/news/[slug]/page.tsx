import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ShareBar } from "@/components/ui/share-bar";
import { logAnalyticsEvent } from "@/lib/analytics";
import { getPublicNewsByCode } from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { localeCanonical } from "@/lib/seo";
import { newsPath, parsePostCode, schoolPath } from "@/lib/urls";

const TIER_LABEL: Record<string, string> = {
  organic: "News",
  featured: "Featured",
  press_release: "Press release",
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const code = parsePostCode(slug);
  if (code === null) return { title: "Not found" };
  const post = await getPublicNewsByCode(code);
  if (!post) return { title: "Not found" };
  const canonical = localeCanonical(locale, newsPath("en", post.post_slug));
  const description = post.body.slice(0, 160);
  return {
    title: `${post.title}, ${post.school_name} — SchoolOye`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: canonical,
      siteName: "SchoolOye",
    },
    twitter: { card: "summary", title: post.title, description },
  };
}

export default async function NewsPostPage({ params }: PageProps<"/[locale]/news/[slug]">) {
  const { locale, slug } = await params;
  // Resolved by the permanent post_code (D-125-style, see
  // 20260929050000_events_and_news_depth.sql): "stays there forever" per
  // Prav's requirement, even if the headline is later corrected.
  const code = parsePostCode(slug);
  if (code === null) notFound();
  const post = await getPublicNewsByCode(code);
  if (!post) notFound();
  if (post.post_slug !== slug) permanentRedirect(newsPath(locale, post.post_slug));

  await logAnalyticsEvent({
    eventType: "page_view",
    entityType: "news",
    entityId: post.id,
    schoolId: post.school_id,
  });

  const newsJsonLd = {
    "@context": "https://schema.org",
    "@type": post.kind === "press" ? "PressRelease" : "NewsArticle",
    headline: post.title,
    articleBody: post.body,
    datePublished: post.published_at,
    // Structured-data section audit (29 Sep 2026) — @id, not just a name
    // string, so this resolves to the same School node as entity-page.tsx's
    // schoolJsonLd (which now links back via subjectOf) instead of two nodes
    // that only coincide on text.
    publisher: {
      "@type": "School",
      "@id": `${siteUrl}${schoolPath(locale, post.school_slug)}#school`,
      name: post.school_name,
    },
  };

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }}
      />

      <div className="flex items-center gap-2">
        <span className="text-meta font-semibold text-muted-ink capitalize">{post.kind}</span>
        {post.tier !== "organic" && (
          <span className="rounded-full border border-ruled-blue px-2 py-0.5 text-meta font-semibold text-ruled-blue">
            {TIER_LABEL[post.tier]}
          </span>
        )}
      </div>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">{post.title}</h1>
      <p className="mt-2 text-body">
        <Link href={schoolPath(locale, post.school_slug)} className="font-semibold text-ruled-blue">
          {post.school_name}
        </Link>
        {" · "}
        {new Date(post.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
      </p>

      <p className="mt-4 max-w-2xl whitespace-pre-wrap text-body">{post.body}</p>

      {post.source_url && (
        <a
          href={post.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block text-meta text-ruled-blue"
        >
          Source: {post.source_url}
        </a>
      )}

      <ShareBar
        title={post.title}
        entityType="news"
        entityId={post.id}
        schoolId={post.school_id}
        className="mt-6"
      />
    </div>
  );
}
