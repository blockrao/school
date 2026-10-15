import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SchoolOye: find and compare schools";

/** Default share image for every page that has no image of its own (school pages do). */
export default function Image() {
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
      <div style={{ fontSize: 34, fontWeight: 700, color: "#2451B8" }}>SchoolOye</div>
      <div
        style={{ marginTop: 40, fontSize: 68, fontWeight: 700, color: "#111111", lineHeight: 1.15 }}
      >
        Find the right school for your child
      </div>
      <div style={{ marginTop: 24, fontSize: 32, color: "#555555" }}>
        Boards, grades, locations and admissions in one place
      </div>
    </div>,
    { ...size },
  );
}
