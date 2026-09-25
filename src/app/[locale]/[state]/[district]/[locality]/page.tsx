import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaMapLazy } from "@/components/ui/area-map-lazy";
import { StatusPill } from "@/components/ui/badges";
import { NotYetPublished } from "@/components/ui/freshness-line";
import { SchoolCard } from "@/components/ui/school-card";
import { EmptyState } from "@/components/ui/state-message";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardNamesBySchoolId,
  getPublicAreaBySlug,
  getPublicCityByDistrictId,
  getPublicDistrictBySlug,
  getPublicLocalityBySlug,
  getPublicStateBySlug,
  listLocalityNeighbors,
  listPublicSchoolsByLocality,
} from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { parseGeographyPoint } from "@/lib/geo";
import { formatGradeRange } from "@/lib/grades";

async function resolveLocalityPage(stateSlug: string, districtSlug: string, localitySlug: string) {
  const [district, state, area] = await Promise.all([
    getPublicDistrictBySlug(districtSlug),
    getPublicStateBySlug(stateSlug),
    getPublicAreaBySlug(districtSlug),
  ]);
  if (!district || !state || district.state_id !== state.id || !area || !area.is_launch) {
    return null;
  }

  const city = await getPublicCityByDistrictId(district.id);
  if (!city) return null;

  const locality = await getPublicLocalityBySlug(city.id, localitySlug);
  if (!locality) return null;

  return { district, state, area, city, locality };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[state]/[district]/[locality]">): Promise<Metadata> {
  const { state: stateSlug, district: districtSlug, locality: localitySlug } = await params;
  const resolved = await resolveLocalityPage(stateSlug, districtSlug, localitySlug);
  if (!resolved) return { title: "Not found" };

  const { locality, area } = resolved;
  const label = locality.isTown ? `Near ${locality.name}` : locality.name;

  return {
    title: `Schools ${locality.isTown ? "near" : "in"} ${locality.name}, ${area.name} — SchoolOye`,
    description: `${label}: schools, fees, facilities and admission dates in ${area.name}.`,
    alternates: { canonical: `/${stateSlug}/${districtSlug}/${localitySlug}` },
  };
}

export default async function LocalityPage({
  params,
}: PageProps<"/[locale]/[state]/[district]/[locality]">) {
  const { locale, state: stateSlug, district: districtSlug, locality: localitySlug } = await params;
  const now = new Date();

  const resolved = await resolveLocalityPage(stateSlug, districtSlug, localitySlug);
  if (!resolved) notFound();
  const { area, locality } = resolved;

  const [schools, neighbors] = await Promise.all([
    listPublicSchoolsByLocality(locality.id),
    listLocalityNeighbors(locality.id),
  ]);

  const schoolIds = schools.map((s) => s.id);
  const [boardNames, admissionDeadlines] = await Promise.all([
    getBoardNamesBySchoolId(schoolIds),
    getAdmissionDeadlinesBySchoolId(schoolIds),
  ]);

  const basePath = `/${locale}/${stateSlug}/${districtSlug}`;
  const localityPath = `${basePath}/${localitySlug}`;
  const heading = locality.isTown ? `Schools near ${locality.name}` : `Schools in ${locality.name}`;

  const mapPoints = schools.flatMap((school) => {
    const point = parseGeographyPoint(school.location);
    if (!point) return [];
    return [
      {
        id: school.id,
        lat: point.lat,
        lng: point.lng,
        label: school.name_en,
        href: `/${locale}/school/${school.id}-${school.slug}`,
        precision: school.geocode_precision ?? "pincode",
      },
    ];
  });
  const mapCenter =
    locality.lat != null && locality.lng != null
      ? { lat: locality.lat, lng: locality.lng }
      : mapPoints[0]
        ? { lat: mapPoints[0].lat, lng: mapPoints[0].lng }
        : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: area.state, item: `/${locale}/${stateSlug}` },
      { "@type": "ListItem", position: 2, name: area.name, item: basePath },
      { "@type": "ListItem", position: 3, name: locality.name, item: localityPath },
    ],
  };

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
        <Link href={basePath}>{area.state}</Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <Link href={basePath}>{area.name}</Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{locality.name}</span>
      </nav>

      <h1 className="font-display text-title-m md:text-title-d">{heading}</h1>
      <p className="mt-1 text-body text-muted-ink">
        {locality.schoolCount} school{locality.schoolCount === 1 ? "" : "s"} · {area.name}
      </p>

      {mapCenter && (
        <div className="mt-5">
          <AreaMapLazy
            points={mapPoints}
            centerLat={mapCenter.lat}
            centerLng={mapCenter.lng}
            zoom={locality.isTown ? 11 : 13}
          />
          <p className="mt-1.5 text-meta text-muted-ink">
            Approximate areas, not exact addresses — schools here are geocoded to{" "}
            {locality.isTown ? "pincode" : "locality"} precision.
          </p>
        </div>
      )}

      <div className="mt-6">
        {schools.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {schools.map((school) => {
              const board = boardNames.get(school.id);
              const grades = formatGradeRange(school.min_class, school.max_class);
              const meta = board ? `${board} · ${grades}` : grades;

              const closesOn = admissionDeadlines.get(school.id);
              const deadline = { closesAt: closesOn ? new Date(closesOn) : null };
              const pill = deadlineToPill(deadlineState(deadline, now));

              return (
                <SchoolCard
                  key={school.id}
                  name={school.name_en}
                  meta={meta}
                  now={now}
                  deadline={deadline}
                  status={<StatusPill status={pill.status}>{pill.label}</StatusPill>}
                  fee="Not yet published"
                  freshness={<NotYetPublished />}
                  actions={false}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No published schools here yet"
            description="Schools appear here once they're verified and published."
            nextStepLabel={`Browse all schools in ${area.name}`}
            nextStepHref={basePath}
          />
        )}
      </div>

      {neighbors.length > 0 && (
        <div className="mt-8 border-t border-rule pt-6">
          <h2 className="font-display text-card md:text-section">Nearby</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {neighbors.map((neighbor) => (
              <Link
                key={neighbor.slug}
                href={`${basePath}/${neighbor.slug}`}
                className="flex min-h-10 items-center rounded-md border border-rule bg-copy-white px-3 text-body font-medium hover:border-ruled-blue"
              >
                {neighbor.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
