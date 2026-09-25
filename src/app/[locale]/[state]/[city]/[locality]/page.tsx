import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AreaMapLazy } from "@/components/ui/area-map-lazy";
import { StatusPill } from "@/components/ui/badges";
import { NotYetPublished } from "@/components/ui/freshness-line";
import { SchoolCard } from "@/components/ui/school-card";
import { EmptyState } from "@/components/ui/state-message";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardNamesBySchoolId,
  getPublicCityAreaBySlug,
  getPublicLocalityBySlug,
  listLocalityNeighbors,
  listPublicSchoolsByLocality,
} from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { formatGradeRange } from "@/lib/grades";

async function resolveLocalityPage(stateSlug: string, citySlug: string, localitySlug: string) {
  const city = await getPublicCityAreaBySlug(citySlug);
  if (!city?.isLaunch || city.stateSlug !== stateSlug) return null;

  const locality = await getPublicLocalityBySlug(city.citySlug, localitySlug);
  if (!locality) return null;

  // Towns are peer-level in the URL (/[state]/[town], not nested under a
  // city) — a locality-shaped request for one belongs at that URL instead.
  if (locality.isTown) return { redirectTo: `/${stateSlug}/${localitySlug}` as const };

  return { city, locality };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[state]/[city]/[locality]">): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, locality: localitySlug } = await params;
  const resolved = await resolveLocalityPage(stateSlug, citySlug, localitySlug);
  if (!resolved) return { title: "Not found" };
  if ("redirectTo" in resolved) return { title: "Redirecting" };

  const { locality, city } = resolved;

  return {
    title: `Schools in ${locality.name}, ${city.cityName} — SchoolOye`,
    description: `${locality.name}: schools, fees, facilities and admission dates in ${city.cityName}.`,
    alternates: { canonical: `/${stateSlug}/${citySlug}/${localitySlug}` },
  };
}

export default async function LocalityPage({
  params,
}: PageProps<"/[locale]/[state]/[city]/[locality]">) {
  const { locale, state: stateSlug, city: citySlug, locality: localitySlug } = await params;
  const now = new Date();

  const resolved = await resolveLocalityPage(stateSlug, citySlug, localitySlug);
  if (!resolved) notFound();
  if ("redirectTo" in resolved) permanentRedirect(`/${locale}${resolved.redirectTo}`);
  const { city, locality } = resolved;

  const [schools, neighbors] = await Promise.all([
    listPublicSchoolsByLocality(locality.id),
    listLocalityNeighbors(locality.slug),
  ]);

  const schoolIds = schools.map((s) => s.id);
  const [boardNames, admissionDeadlines] = await Promise.all([
    getBoardNamesBySchoolId(schoolIds),
    getAdmissionDeadlinesBySchoolId(schoolIds),
  ]);

  const basePath = `/${locale}/${stateSlug}/${citySlug}`;
  const localityPath = `${basePath}/${localitySlug}`;
  const heading = `Schools in ${locality.name}`;

  const mapPoints = schools.flatMap((school) => {
    if (school.lat == null || school.lng == null) return [];
    return [
      {
        id: school.id,
        lat: school.lat,
        lng: school.lng,
        label: school.name_en ?? "Name not yet published",
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
      { "@type": "ListItem", position: 1, name: city.stateName, item: `/${locale}/${stateSlug}` },
      { "@type": "ListItem", position: 2, name: city.cityName, item: basePath },
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
        <Link href={`/${locale}/${stateSlug}`}>{city.stateName}</Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <Link href={basePath}>{city.cityName}</Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{locality.name}</span>
      </nav>

      <h1 className="font-display text-title-m md:text-title-d">{heading}</h1>
      <p className="mt-1 text-body text-muted-ink">
        {locality.schoolCount} school{locality.schoolCount === 1 ? "" : "s"} · {city.cityName}
      </p>

      {mapCenter && (
        <div className="mt-5">
          <AreaMapLazy
            points={mapPoints}
            centerLat={mapCenter.lat}
            centerLng={mapCenter.lng}
            zoom={13}
          />
          <p className="mt-1.5 text-meta text-muted-ink">
            Approximate areas, not exact addresses — schools here are geocoded to locality
            precision.
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
                  href={`/${locale}/school/${school.id}-${school.slug}`}
                  name={school.name_en ?? "Name not yet published"}
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
            nextStepLabel={`Browse all schools in ${city.cityName}`}
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
