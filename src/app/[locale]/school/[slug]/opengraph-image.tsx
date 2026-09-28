import { ImageResponse } from "next/og";
import { resolveSchoolSlug } from "../../_views/resolve";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const result = await resolveSchoolSlug(slug);

  let title = "SchoolOye";
  let subtitle = "Find the right school";

  if (result?.kind === "school") {
    const { school, board } = result.resolved.bundle;
    title = school.name_en ?? "SchoolOye";
    subtitle = [board?.board_name, result.resolved.city?.cityName].filter(Boolean).join(" · ");
  }

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
          fontSize: 64,
          fontWeight: 700,
          color: "#111111",
          lineHeight: 1.15,
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 20, fontSize: 32, color: "#555555" }}>{subtitle}</div>
    </div>,
    { ...size },
  );
}
