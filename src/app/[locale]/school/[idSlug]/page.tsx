import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AreaMapLazy } from "@/components/ui/area-map-lazy";
import { StatusPill } from "@/components/ui/badges";
import { DeadlineMargin } from "@/components/ui/deadline-margin";
import { FreshnessLine, NotYetPublished } from "@/components/ui/freshness-line";
import { ShareButton } from "@/components/ui/share-button";
import type { PublicSchoolAdmission } from "@/contracts";
import {
  getPublicAdmissionsBySchoolId,
  getPublicCityByDistrictId,
  getPublicDistrictById,
  getPublicSchoolByIdSlug,
  getPublicStateById,
  listPublicBoards,
} from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { formatGradeRange } from "@/lib/grades";
import { slugify } from "@/lib/slug";
import { titleCase } from "@/lib/text";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseIdSlug(idSlug: string): { id: string; slug: string } | null {
  if (idSlug.length < 38 || idSlug[36] !== "-") return null;
  const id = idSlug.slice(0, 36);
  if (!UUID_RE.test(id)) return null;
  return { id, slug: idSlug.slice(37) };
}

async function resolveSchoolPage(idSlug: string) {
  const parsed = parseIdSlug(idSlug);
  if (!parsed) return null;

  const result = await getPublicSchoolByIdSlug(parsed.id);
  if (!result) return null;

  if (result.school.slug !== parsed.slug) {
    return { redirectTo: `${parsed.id}-${result.school.slug}` as const };
  }

  const [boards, admissions, city] = await Promise.all([
    listPublicBoards(),
    getPublicAdmissionsBySchoolId(parsed.id),
    result.school.district_id ? getPublicCityByDistrictId(result.school.district_id) : null,
  ]);

  let stateInfo: { name: string; slug: string } | null = null;
  if (result.school.district_id) {
    const district = await getPublicDistrictById(result.school.district_id);
    if (district) {
      const state = await getPublicStateById(district.state_id);
      if (state) stateInfo = { name: state.name_en, slug: slugify(state.name_en) };
    }
  }

  const boardId = result.affiliations[0]?.board_id;
  const board = boardId ? (boards.find((b) => b.id === boardId) ?? null) : null;
  const affiliationNo = result.affiliations[0]?.affiliation_no ?? null;

  return { ...result, admissions, city, state: stateInfo, board, affiliationNo };
}

function schoolOrgType(maxClass: string | null): string {
  const maxNum = maxClass ? Number(maxClass.replace(/^c/, "")) : null;
  if (maxNum != null && maxNum <= 5) return "ElementarySchool";
  if (maxNum != null && maxNum >= 9) return "HighSchool";
  return "School";
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/school/[idSlug]">): Promise<Metadata> {
  const { idSlug } = await params;
  const resolved = await resolveSchoolPage(idSlug);
  if (!resolved) return { title: "Not found" };
  if ("redirectTo" in resolved) return { title: "Redirecting" };

  const { school, city } = resolved;
  const name = school.name_en ?? "School";
  const areaLabel = school.locality_name ?? city?.name_en ?? "";

  return {
    title: `${name}${areaLabel ? `, ${areaLabel}` : ""} — SchoolOye`,
    description: `${name}: board, grades, fees and admission dates${areaLabel ? ` in ${areaLabel}` : ""}.`,
    alternates: { canonical: `/school/${school.id}-${school.slug}` },
  };
}

export default async function SchoolPage({ params }: PageProps<"/[locale]/school/[idSlug]">) {
  const { locale, idSlug } = await params;
  const now = new Date();

  const resolved = await resolveSchoolPage(idSlug);
  if (!resolved) notFound();
  if ("redirectTo" in resolved) permanentRedirect(`/${locale}/school/${resolved.redirectTo}`);

  const { school, admissions, city, state, board, affiliationNo } = resolved;
  const name = school.name_en ?? "Name not yet published";
  const grades = formatGradeRange(school.min_class, school.max_class);

  const localityPath =
    state && city && school.locality_slug
      ? `/${locale}/${state.slug}/${city.slug}/${school.locality_slug}`
      : null;
  const cityPath = state && city ? `/${locale}/${state.slug}/${city.slug}` : null;
  const statePath = state ? `/${locale}/${state.slug}` : null;

  const breadcrumbTrail = [
    state && statePath ? { name: state.name, href: statePath } : null,
    city && cityPath ? { name: titleCase(city.name_en), href: cityPath } : null,
    school.locality_name && localityPath
      ? { name: school.locality_name, href: localityPath }
      : null,
  ].filter((x): x is { name: string; href: string } => x !== null);

  // Earliest closing (still-open-relevant) cycle drives the DeadlineMargin card;
  // "not-announced" renders on its own when there are none, matching every other
  // deadline surface in the app.
  const primaryAdmission: PublicSchoolAdmission | undefined = admissions[0];
  const deadlineInput = {
    opensAt: primaryAdmission?.opens_on ? new Date(primaryAdmission.opens_on) : null,
    closesAt: primaryAdmission?.closes_on ? new Date(primaryAdmission.closes_on) : null,
  };
  const pill = deadlineToPill(deadlineState(deadlineInput, now));

  const verifiedAt = school.last_verified_at ? new Date(school.last_verified_at) : null;

  const mapPoint =
    school.lat != null && school.lng != null
      ? {
          id: school.id,
          lat: school.lat,
          lng: school.lng,
          label: name,
          precision: school.geocode_precision ?? "pincode",
        }
      : null;

  const orgType = schoolOrgType(school.max_class);
  const schoolJsonLd = {
    "@context": "https://schema.org",
    "@type": orgType,
    name,
    ...(school.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: school.address,
            postalCode: school.pincode ?? undefined,
            addressRegion: state?.name,
            addressCountry: "IN",
          },
        }
      : {}),
    ...(mapPoint
      ? { geo: { "@type": "GeoCoordinates", latitude: mapPoint.lat, longitude: mapPoint.lng } }
      : {}),
    ...(affiliationNo ? { identifier: affiliationNo } : {}),
    url: `https://schooloye.in/school/${school.id}-${school.slug}`,
    ...(school.website ? { sameAs: school.website } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      ...breadcrumbTrail.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: crumb.href,
      })),
      {
        "@type": "ListItem",
        position: breadcrumbTrail.length + 1,
        name,
        item: `/school/${school.id}-${school.slug}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-6 md:px-10 md:py-9">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {breadcrumbTrail.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
          {breadcrumbTrail.map((crumb) => (
            <span key={crumb.href}>
              <Link href={crumb.href}>{crumb.name}</Link>
              <span className="mx-1.5" aria-hidden="true">
                /
              </span>
            </span>
          ))}
          <span className="text-ink">{name}</span>
        </nav>
      )}

      <div className="flex flex-col gap-2 border-b border-rule pb-6">
        <h1 className="font-display text-title-m md:text-title-d">{name}</h1>
        <p className="text-body text-muted-ink">
          {[board?.name_en, grades, school.management, school.gender].filter(Boolean).join(" · ") ||
            "Not yet published"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <StatusPill status={pill.status}>{pill.label}</StatusPill>
          <ShareButton title={name} />
        </div>
      </div>

      <div className="grid gap-6 py-6 md:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="facts-heading" className="flex flex-col gap-3">
            <h2 id="facts-heading" className="font-display text-card font-semibold">
              School facts
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body">
              <div>
                <dt className="text-meta font-semibold text-muted-ink">Board</dt>
                <dd>{board?.name_en ?? <NotYetPublished />}</dd>
              </div>
              <div>
                <dt className="text-meta font-semibold text-muted-ink">Affiliation no.</dt>
                <dd>{affiliationNo ?? <NotYetPublished />}</dd>
              </div>
              <div>
                <dt className="text-meta font-semibold text-muted-ink">Grades</dt>
                <dd>{grades}</dd>
              </div>
              <div>
                <dt className="text-meta font-semibold text-muted-ink">Established</dt>
                <dd>{school.established_year ?? <NotYetPublished />}</dd>
              </div>
              <div>
                <dt className="text-meta font-semibold text-muted-ink">Fee range</dt>
                <dd>
                  <NotYetPublished />
                </dd>
              </div>
              <div>
                <dt className="text-meta font-semibold text-muted-ink">Medium</dt>
                <dd>
                  {school.medium && school.medium.length > 0 ? (
                    school.medium.join(", ")
                  ) : (
                    <NotYetPublished />
                  )}
                </dd>
              </div>
            </dl>
            {verifiedAt ? (
              <FreshnessLine
                source="SchoolOye verification"
                retrievedAt={verifiedAt}
                verifiedAt={verifiedAt}
                now={now}
              />
            ) : (
              <span className="text-meta text-slate">Not yet verified</span>
            )}
          </section>

          <section aria-labelledby="admissions-heading" className="flex flex-col gap-3">
            <h2 id="admissions-heading" className="font-display text-card font-semibold">
              Admissions
            </h2>
            {admissions.length > 0 ? (
              <div className="flex flex-col gap-3">
                {admissions.map((cycle) => {
                  const cycleDeadline = {
                    opensAt: cycle.opens_on ? new Date(cycle.opens_on) : null,
                    closesAt: cycle.closes_on ? new Date(cycle.closes_on) : null,
                  };
                  return (
                    <div
                      key={`${cycle.academic_year}-${cycle.class_code}`}
                      className="flex items-center gap-3 rounded-md border border-rule p-3"
                    >
                      <DeadlineMargin {...cycleDeadline} now={now} className="h-20 w-32 shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold">
                          {cycle.academic_year} · Class {cycle.class_code.replace(/^c/, "")}
                        </span>
                        <span className="text-meta text-muted-ink">
                          {cycle.form_mode === "online" ? "Online form" : "Offline form"}
                          {cycle.registration_fee != null ? ` · ₹${cycle.registration_fee}` : ""}
                        </span>
                        {cycle.form_url && (
                          <a
                            href={cycle.form_url}
                            className="font-semibold text-ruled-blue text-meta"
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                          >
                            Application form ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body text-muted-ink">Dates not announced</p>
            )}
          </section>

          {mapPoint && (
            <section aria-labelledby="location-heading" className="flex flex-col gap-3">
              <h2 id="location-heading" className="font-display text-card font-semibold">
                Location
              </h2>
              <AreaMapLazy
                points={[mapPoint]}
                centerLat={mapPoint.lat}
                centerLng={mapPoint.lng}
                zoom={14}
              />
              <p className="text-meta text-muted-ink">
                {school.address ?? "Address not yet published"} — approximate area, not an exact pin
                (geocoded to {school.geocode_precision ?? "pincode"} precision).
              </p>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section
            aria-labelledby="contact-heading"
            className="flex flex-col gap-2 rounded-md border border-rule p-4"
          >
            <h2 id="contact-heading" className="font-display text-card font-semibold">
              Contact
            </h2>
            <div className="flex flex-col gap-1.5 text-body">
              <div>
                <span className="text-meta font-semibold text-muted-ink">Phone: </span>
                {school.phone && school.phone.length > 0 ? (
                  school.phone.join(", ")
                ) : (
                  <NotYetPublished />
                )}
              </div>
              <div>
                <span className="text-meta font-semibold text-muted-ink">Email: </span>
                {school.email && school.email.length > 0 ? (
                  school.email.join(", ")
                ) : (
                  <NotYetPublished />
                )}
              </div>
              <div>
                <span className="text-meta font-semibold text-muted-ink">Website: </span>
                {school.website ? (
                  <a
                    href={school.website}
                    className="font-semibold text-ruled-blue"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {school.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <NotYetPublished />
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
