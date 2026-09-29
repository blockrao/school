import { ImageResponse } from "next/og";
import { getPublicJobByCode } from "@/lib/db/public-adapter";
import { parseJobCode } from "@/lib/urls";

// Mirrors src/app/[locale]/news/[slug]/opengraph-image.tsx's pattern —
// Phase 1 shareability work (29 Sep 2026): a News/Events/Jobs link shared to
// WhatsApp previously got a generic site-wide card instead of a preview that
// actually names the story, so nobody could tell what they were opening
// before clicking. Same layout as the school card so a shared card still
// reads as "SchoolOye" at a glance, just with this job's own title.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  visiting: "Visiting faculty",
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const code = parseJobCode(slug);
  const job = code === null ? null : await getPublicJobByCode(code);

  const title = job?.title ?? "SchoolOye";
  const subtitle = job
    ? [EMPLOYMENT_TYPE_LABEL[job.employment_type], job.school_name].filter(Boolean).join(" · ")
    : "";

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
