import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  BOARD_HUB_MIN_SCHOOLS,
  boardHubSlug,
  boardShortName,
  parseBoardHubSegment,
} from "@/lib/board-slug";
import { getBoardCategoryLinksForDistrict, getPublicCityAreaBySlug } from "@/lib/db/public-adapter";
import { cityPath, localityPath } from "@/lib/urls";
import { LocalityView, localityMetadata } from "../../../../_views/entity-page";
import { PlaceView, placeMetadata } from "../../../../_views/place-page";
import { resolveLocality } from "../../../../_views/resolve";

// See ../../page.tsx ([state]) for why this is here — same missing-revalidate bug.
export const revalidate = 900;

export function generateStaticParams() {
  return [];
}

/** /schools/{state}/{city}/all-schools: the full, paginated, filterable listing (the city page itself is the hub). */
const ALL_SCHOOLS = "all-schools";

/**
 * /schools/{state}/{city}/{board}-schools: a board hub (CBSE, ICSE …), only when the
 * city has at least BOARD_HUB_MIN_SCHOOLS such schools. Null otherwise, so the
 * segment falls through to locality resolution.
 */
async function resolveBoardHub(_stateSlug: string, citySlug: string, segment: string) {
  const boardSlug = parseBoardHubSegment(segment);
  if (!boardSlug) return null;
  const city = await getPublicCityAreaBySlug(citySlug);
  if (!city) return null;
  const links = await getBoardCategoryLinksForDistrict(city.districtIds);
  const hit = links.find(
    (l) => boardHubSlug(l.board.name_en) === boardSlug && l.count >= BOARD_HUB_MIN_SCHOOLS,
  );
  if (!hit) return null;
  return {
    city,
    hub: {
      slug: boardSlug,
      boardId: hit.board.id,
      name: boardShortName(hit.board.name_en),
      count: hit.count,
    },
  };
}

/** /schools/{state}/{city}/{locality} — discovery (D-121 §1); towns use the town template. */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/schools/[state]/[city]/[locality]">): Promise<Metadata> {
  const { locale, state, city, locality } = await params;
  if (locality === ALL_SCHOOLS) {
    const area = await getPublicCityAreaBySlug(city);
    if (!area || area.isCityState) return { title: "Not found" };
    if (area.stateSlug !== state) return { title: "Redirecting" };
    return placeMetadata(locale, { kind: "city", city: area }, {});
  }
  const board = await resolveBoardHub(state, city, locality);
  if (board) {
    if (board.city.stateSlug !== state) return { title: "Redirecting" };
    return placeMetadata(locale, { kind: "city", city: board.city }, {}, board.hub);
  }
  const resolved = await resolveLocality(city, locality);
  if (!resolved) return { title: "Not found" };
  if (resolved.kind === "town") {
    if (resolved.town.stateSlug !== state) return { title: "Redirecting" };
    return placeMetadata(locale, resolved, {});
  }
  if (resolved.resolved.city.stateSlug !== state) return { title: "Redirecting" };
  return localityMetadata(locale, resolved.resolved);
}

export default async function LocalityPage({
  params,
}: PageProps<"/[locale]/schools/[state]/[city]/[locality]">) {
  const { locale, state, city, locality } = await params;
  if (locality === ALL_SCHOOLS) {
    const area = await getPublicCityAreaBySlug(city);
    if (!area || area.isCityState) notFound();
    if (area.stateSlug !== state) {
      permanentRedirect(`${cityPath(locale, area.stateSlug, area.citySlug)}/${ALL_SCHOOLS}`);
    }
    return (
      <PlaceView locale={locale} resolved={{ kind: "city", city: area }} rawSearchParams={{}} />
    );
  }
  const board = await resolveBoardHub(state, city, locality);
  if (board) {
    if (board.city.stateSlug !== state) {
      permanentRedirect(
        `${cityPath(locale, board.city.stateSlug, board.city.citySlug)}/${board.hub.slug}-schools`,
      );
    }
    return (
      <PlaceView
        locale={locale}
        resolved={{ kind: "city", city: board.city }}
        rawSearchParams={{}}
        boardHub={board.hub}
      />
    );
  }
  const resolved = await resolveLocality(city, locality);
  if (!resolved) notFound();

  if (resolved.kind === "town") {
    const { town } = resolved;
    if (town.stateSlug !== state) {
      permanentRedirect(localityPath(locale, town.stateSlug, town.citySlug, town.townSlug));
    }
    return <PlaceView locale={locale} resolved={resolved} rawSearchParams={{}} />;
  }

  const { city: cityArea, locality: loc } = resolved.resolved;
  if (cityArea.stateSlug !== state) {
    permanentRedirect(localityPath(locale, cityArea.stateSlug, cityArea.citySlug, loc.slug));
  }
  return <LocalityView locale={locale} resolved={resolved.resolved} />;
}
