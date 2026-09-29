import { ImageResponse } from "next/og";
import { getPublicNewsByCode } from "@/lib/db/public-adapter";
import { parsePostCode } from "@/lib/urls";

// Mirrors src/app/[locale]/school/[slug]/opengraph-image.tsx's pattern —
// Phase 1 shareability work (29 Sep 2026): a News/Events/Jobs link shared to
// WhatsApp previously got a generic site-wide card instead of a preview that
// actually names the story, so nobody could tell what they were opening
// before clicking. Same layout as the school card so a shared card still
// reads as "SchoolOye" at a glance, just with this story's own headline.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const KIND_LABEL: Record<string, string> = { news: "News", press: "Press release" };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const code = parsePostCode(slug);
  const post = code === null ? null : await getPublicNewsByCode(code);

  const title = post?.title ?? "SchoolOye";
  const subtitle = post ? [KIND_LABEL[post.kind], post.school_name].filter(Boolean).join(" · ") : "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        backgroundColor: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "#2451B8" }}>SchoolOye</div>
      <div
        style={{
          marginTop: 40,
          fontSize: 60,
          fontWeight: 700,
          color: "#111111",
          lineHeight: 1.15,
        }}
      >
        {title}
      </div>
      {subtitle && <div style={{ marginTop: 20, fontSize: 32, color: "#555555" }}>{subtitle}</div>}
    </div>,
    { ...size },
  );
}
