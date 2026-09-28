import { requireStaff } from "@/lib/db/ops";
import { siteUrl } from "@/lib/env.server";
import { schoolPath } from "@/lib/urls";

/**
 * Staff-only CSV export of every school's permanent URL (D-121, D-123), for
 * independent checking. Reads the raw tables through the signed-in staff
 * session under RLS (D-103) — tables: schools, districts, states, localities.
 * Rows are in minting order (created_at, id), so "first created keeps the
 * shortest slug" can be checked directly. Draft schools are included, flagged
 * by status; only 'published' and 'closed' are public.
 */
export const dynamic = "force-dynamic";

const PAGE = 1000;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const { supabase } = await requireStaff();

  const [{ data: districts }, { data: states }, { data: localities }] = await Promise.all([
    supabase.from("districts").select("id, slug, state_id"),
    supabase.from("states").select("id, slug"),
    supabase.from("localities").select("id, slug"),
  ]);
  const stateSlug = new Map((states ?? []).map((s) => [s.id, s.slug]));
  const district = new Map((districts ?? []).map((d) => [d.id, d]));
  const localitySlug = new Map((localities ?? []).map((l) => [l.id, l.slug]));

  const header = [
    "slug",
    "url",
    "name_en",
    "status",
    "public",
    "state",
    "city",
    "locality",
    "school_code",
    "id",
    "created_at",
  ];
  const lines = [header.join(",")];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("schools")
      .select("id, school_code, slug, name_en, status, district_id, locality_id, created_at")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });
    for (const s of data ?? []) {
      const d = s.district_id != null ? district.get(s.district_id) : undefined;
      const isPublic = s.status === "published" || s.status === "closed";
      lines.push(
        [
          s.slug,
          `${siteUrl}${schoolPath("en", s.slug)}`,
          s.name_en,
          s.status,
          isPublic ? "yes" : "no",
          d ? stateSlug.get(d.state_id) : "",
          d?.slug ?? "",
          s.locality_id != null ? localitySlug.get(s.locality_id) : "",
          s.school_code,
          s.id,
          s.created_at,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    if (!data || data.length < PAGE) break;
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="schooloye-school-slugs-${date}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
