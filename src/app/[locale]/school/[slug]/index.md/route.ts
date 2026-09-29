import { getPublicAdmissionsBySchoolId } from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { formatGradeRange } from "@/lib/grades";
import { schoolPath } from "@/lib/urls";
import { resolveSchoolSlug } from "../../../_views/resolve";

/**
 * Markdown twin of the school fact block (docs/guidelines/seo-geo.md §6) — a
 * clean, source-attributed plain-text version of the same facts on the HTML
 * page, for AI crawlers/answer engines to read without parsing markup.
 * Localities have no equivalent twin (nothing thin to publish there), so this
 * route 404s for anything that isn't a resolved school.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await params;
  const result = await resolveSchoolSlug(slug);

  if (!result) return new Response("Not found", { status: 404 });
  if (result.kind === "redirect") {
    return Response.redirect(`${siteUrl}${schoolPath(locale, result.slug)}/index.md`, 301);
  }

  const { school, board } = result.resolved.bundle;
  const name = school.name_en ?? "Name not yet published";
  const grades = formatGradeRange(school.min_class, school.max_class);
  const affiliationNo = board?.affiliation_no ?? null;
  const admissions = await getPublicAdmissionsBySchoolId(school.id);
  const canonicalUrl = `${siteUrl}${schoolPath(locale, school.slug)}`;

  const lines = [
    `# ${name}`,
    "",
    `Canonical page: ${canonicalUrl}`,
    "",
    "## At a glance",
    `- Board: ${board?.board_name ?? "Not yet published"}${affiliationNo ? ` (affiliation no. ${affiliationNo})` : ""}`,
    `- Grades: ${grades}`,
    `- Management: ${school.management ?? "Not yet published"}`,
    `- Gender: ${school.gender ?? "Not yet published"}`,
    `- Medium: ${school.medium && school.medium.length > 0 ? school.medium.join(", ") : "Not yet published"}`,
    `- Established: ${school.established_year ?? "Not yet published"}`,
    `- Address: ${school.address ?? "Not yet published"}`,
    `- Website: ${school.website ?? "Not yet published"}`,
    // Increment 11 (SDP-04) — this twin used to publish raw phone/email, the same
    // exposure just fixed on the HTML page. SchoolOye is a controlled intermediary,
    // not a directory: contact goes through the canonical page's enquiry form.
    `- Contact: via the enquiry form on the canonical page above`,
    `- Verification: ${school.verification}${school.last_verified_at ? ` (last verified ${school.last_verified_at})` : ""}`,
  ];

  if (school.about_en) {
    lines.push("", "## About", school.about_en);
  }

  lines.push("", "## Admissions");
  if (admissions.length > 0) {
    for (const cycle of admissions) {
      lines.push(
        `- ${cycle.academic_year}, class ${cycle.class_code.replace(/^c/, "")}: ${
          cycle.closes_on ? `closes ${cycle.closes_on}` : "dates not announced"
        }${cycle.form_url ? ` — form: ${cycle.form_url}` : ""}`,
      );
    }
  } else {
    lines.push("- Dates not yet published");
  }

  lines.push(
    "",
    'Facts are sourced from official board records and the school\'s own published notices. Unknown values are shown as "Not yet published", never guessed.',
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The HTML page is the one to index; this twin is for AI agents (D-121).
      Link: `<${canonicalUrl}>; rel="canonical"`,
    },
  });
}
