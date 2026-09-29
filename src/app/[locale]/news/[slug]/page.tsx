import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ShareBar } from "@/components/ui/share-bar";
import { logAnalyticsEvent } from "@/lib/analytics";
import {
  getPublicCityAreaBySlug,
  getPublicNewsByCode,
  getPublicSchoolBySlug,
  getPublicSchoolNewsBySchoolId,
} from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { formatGradeRange } from "@/lib/grades";
import { schoolAreaLabel } from "@/lib/school-area-label";
import { localeCanonical } from "@/lib/seo";
import {
  cityPath,
  localityPath as localityHref,
  newsPath,
  parsePostCode,
  schoolPath,
  statePath,
} from "@/lib/urls";

const TIER_LABEL: Record<string, string> = {
  organic: "News",
  featured: "Featured",
  press_release: "Press release",
};

const KIND_LABEL: Record<string, string> = {
  news: "News",
  press: "Press release",
};

// Same fix as the events page: toLocaleString("en-IN", ...) without an
// explicit timeZone formats in the SERVER's local time (UTC on Vercel), not
// India Standard Time. Every school on this site is in India, so hard-coding
// Asia/Kolkata here is never wrong, unlike guessing a visitor's own timezone.
const IST_DATE: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeZone: "Asia/Kolkata" };
const IST_DATE_FULL: Intl.DateTimeFormatOptions = { dateStyle: "long", timeZone: "Asia/Kolkata" };

function formatIst(iso: string, opts: Intl.DateTimeFormatOptions = IST_DATE): string {
  return new Date(iso).toLocaleString("en-IN", opts);
}

async function resolveNewsContext(slug: string) {
  const code = parsePostCode(slug);
  if (code === null) return null;
  const post = await getPublicNewsByCode(code);
  if (!post) return null;
  const bundle = await getPublicSchoolBySlug(post.school_slug);
  const city = bundle?.school.city_slug
    ? await getPublicCityAreaBySlug(bundle.school.city_slug)
    : null;
  return { post, bundle, city };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const ctx = await resolveNewsContext(slug);
  if (!ctx) return { title: "Not found" };
  const { post, bundle, city } = ctx;

  const canonical = localeCanonical(locale, newsPath("en", post.post_slug));
  const description = post.body.slice(0, 160);
  // Same rule as the school and events pages' own title/H1
  // (school-area-label.ts): locality AND city together when both are known.
  const areaLabel = schoolAreaLabel(bundle?.school.locality_name, city?.cityName);
  const titleContext = [post.school_name, areaLabel !== "India" ? areaLabel : null]
    .filter(Boolean)
    .join(", ");

  return {
    title: `${post.title}, ${titleContext} — SchoolOye`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: `${post.title} — ${titleContext}`,
      description,
      url: canonical,
      siteName: "SchoolOye",
      publishedTime: post.published_at,
    },
    twitter: { card: "summary", title: post.title, description },
  };
}

export default async function NewsPostPage({ params }: PageProps<"/[locale]/news/[slug]">) {
  const { locale, slug } = await params;
  // Resolved by the permanent post_code (D-125-style, see
  // 20260929050000_events_and_news_depth.sql): editing the headline only ever
  // changes the display part of the slug, so an old URL 301s here rather
  // than 404ing — "stays there forever" per Prav's requirement.
  const code = parsePostCode(slug);
  if (code === null) notFound();
  const ctx = await resolveNewsContext(slug);
  if (!ctx) notFound();
  const { post } = ctx;
  if (post.post_slug !== slug) permanentRedirect(newsPath(locale, post.post_slug));

  const bundle = ctx.bundle;
  const city = ctx.city;
  const school = bundle?.school ?? null;

  await logAnalyticsEvent({
    eventType: "page_view",
    entityType: "news",
    entityId: post.id,
    schoolId: post.school_id,
  });

  const areaLabel = schoolAreaLabel(school?.locality_name, city?.cityName);
  const canonicalPath = newsPath("en", post.post_slug);
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  // Same @id convention the entity page's own schoolJsonLd uses
  // (schoolPath(locale, ...)#school, see entity-page.tsx) — not hardcoded
  // "en" — so this node resolves against the same School node that page's
  // subjectOf array points back at, on every locale.
  const schoolNodeId = `${siteUrl}${schoolPath(locale, post.school_slug)}#school`;
  // Next's file-convention opengraph-image route, same one already wired into
  // <head> og:image/twitter:image via generateMetadata's automatic handling —
  // built by hand here too because JSON-LD isn't part of that automatic
  // metadata pipeline and NewsArticle/PressRelease structured data needs its
  // own `image` (a required field for Google's article rich-result and
  // Top Stories eligibility).
  const articleImageUrl = `${siteUrl}/en${canonicalPath}/opengraph-image`;

  const breadcrumbTrail = city
    ? [
        // A city-state (Delhi) has no separate state crumb (D-126), same
        // convention as the school and events pages' own breadcrumbs.
        ...(city.isCityState
          ? []
          : [{ name: city.stateName, href: statePath(locale, city.stateSlug) }]),
        { name: city.cityName, href: cityPath(locale, city.stateSlug, city.citySlug) },
        ...(school?.locality_slug && school?.locality_name
          ? [
              {
                name: school.locality_name,
                href: localityHref(locale, city.stateSlug, city.citySlug, school.locality_slug),
              },
            ]
          : []),
        { name: post.school_name, href: schoolPath(locale, post.school_slug) },
      ]
    : [{ name: post.school_name, href: schoolPath(locale, post.school_slug) }];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      ...breadcrumbTrail.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: `${siteUrl}${crumb.href}`,
      })),
      {
        "@type": "ListItem",
        position: breadcrumbTrail.length + 1,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  };

  // No named journalist exists in this domain — every post is published by
  // the school itself (or on its behalf) — so author is the same School
  // entity as publisher, sharing the @id with the school page's own JSON-LD
  // node rather than inventing a byline. dateModified falls back to
  // published_at when the post has never been re-reviewed since; never
  // fabricated ahead of a real edit.
  const newsJsonLd = {
    "@context": "https://schema.org",
    "@type": post.kind === "press" ? "PressRelease" : "NewsArticle",
    "@id": canonicalUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    url: canonicalUrl,
    headline: post.title,
    description: post.body.slice(0, 160),
    articleBody: post.body,
    image: [articleImageUrl],
    datePublished: post.published_at,
    dateModified: post.listing_reviewed_at ?? post.published_at,
    author: {
      "@type": "School",
      "@id": schoolNodeId,
      name: post.school_name,
      url: `${siteUrl}${schoolPath(locale, post.school_slug)}`,
    },
    publisher: {
      "@type": "School",
      "@id": schoolNodeId,
      name: post.school_name,
      url: `${siteUrl}${schoolPath(locale, post.school_slug)}`,
    },
  };

  const otherNews = bundle
    ? (await getPublicSchoolNewsBySchoolId(post.school_id))
        .filter((n) => n.id !== post.id)
        .slice(0, 3)
    : [];

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
        {breadcrumbTrail.map((crumb) => (
          <span key={crumb.name}>
            <Link href={crumb.href}>{crumb.name}</Link>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
          </span>
        ))}
        <span className="text-ink">{post.title}</span>
      </nav>

      <div className="flex items-center gap-2">
        <span className="text-meta font-semibold text-muted-ink">
          {KIND_LABEL[post.kind] ?? post.kind}
        </span>
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
        {areaLabel !== "India" && <>, {areaLabel}</>}
        {" · "}
        <time dateTime={post.published_at}>{formatIst(post.published_at, IST_DATE_FULL)}</time>
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

      {/* About the school — real substance instead of a bare link: the same
        facts the school's own page leads with, so this page stands on its
        own for a visitor who lands here straight from a search result. */}
      {school && (
        <div className="mt-8 flex flex-col gap-1.5 rounded-md border border-rule p-4">
          <span className="text-meta font-semibold text-muted-ink">About the school</span>
          <Link
            href={schoolPath(locale, post.school_slug)}
            className="font-display text-card font-semibold hover:text-ruled-blue"
          >
            {post.school_name}
          </Link>
          <p className="text-body text-muted-ink">
            {[
              bundle?.board?.board_name,
              formatGradeRange(school.min_class, school.max_class),
              areaLabel !== "India" ? areaLabel : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      {otherNews.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <span className="text-meta font-semibold text-muted-ink">
            More news from {post.school_name}
          </span>
          <div className="flex flex-col gap-2">
            {otherNews.map((other) => (
              <Link
                key={other.id}
                href={newsPath(locale, other.post_slug)}
                className="flex items-center justify-between gap-3 rounded-md border border-rule p-3 hover:border-ruled-blue"
              >
                <span className="font-semibold">{other.title}</span>
                <span className="text-meta text-muted-ink">{formatIst(other.published_at)}</span>
              </Link>
            ))}
          </div>
          <Link
            href={`${schoolPath(locale, post.school_slug)}#whats-happening-heading`}
            className="w-fit font-semibold text-ruled-blue text-meta"
          >
            See everything happening at {post.school_name} →
          </Link>
        </div>
      )}
    </div>
  );
}
