import Link from "next/link";
import {
  getPublicCityBySlug,
  listOpenAdmissionsByDistrict,
  listPublicEvents,
  listPublicJobs,
  listPublicNews,
  type PublicCityArea,
} from "@/lib/db/public-adapter";
import { deadlineState } from "@/lib/deadline";
import { eventPath, jobPath, newsPath, schoolPath } from "@/lib/urls";

type Item = { key: string; href: string; title: string; sub?: string };

function Block({ title, items, moreHref }: { title: string; items: Item[]; moreHref?: string }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-md border border-rule bg-copy-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-card font-semibold">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className="text-body font-semibold text-ruled-blue">
            See all
          </Link>
        )}
      </div>
      <ul className="mt-2 flex flex-col divide-y divide-rule-soft">
        {items.map((item) => (
          <li key={item.key}>
            <Link href={item.href} className="flex flex-col gap-0.5 py-2 hover:text-ruled-blue">
              <span className="text-body font-medium">{item.title}</span>
              {item.sub && <span className="text-meta text-muted-ink">{item.sub}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * City hub blocks that fill in as data arrives: admissions open, closing soon,
 * and the city's latest school news, events and jobs. A block with no real
 * rows renders nothing, so an unenriched city shows no empty placeholders.
 */
export async function CityHighlights({ locale, city }: { locale: string; city: PublicCityArea }) {
  const now = new Date();
  const cityRow = await getPublicCityBySlug(city.citySlug);
  const cityId = cityRow?.id;
  const [admissions, news, events, jobs] = await Promise.all([
    listOpenAdmissionsByDistrict(city.districtIds, 12),
    cityId ? listPublicNews({ cityId }) : Promise.resolve([]),
    cityId ? listPublicEvents({ cityId }) : Promise.resolve([]),
    cityId ? listPublicJobs({ cityId }) : Promise.resolve([]),
  ]);

  const withState = admissions.map((a) => ({
    a,
    state: deadlineState({ closesAt: a.closesOn ? new Date(a.closesOn) : null }, now),
  }));
  const toItem = ({ a, state }: (typeof withState)[number]): Item => ({
    key: a.schoolId,
    href: schoolPath(locale, a.slug),
    title: a.nameEn,
    sub: a.closesOn ? `${state.top} ${state.big} ${state.bottom}`.trim() : undefined,
  });
  const closingSoon = withState
    .filter(({ state }) => state.status === "closing-soon" || state.status === "deadline-day")
    .slice(0, 5)
    .map(toItem);
  const open = withState.slice(0, 5).map(toItem);

  const upcomingEvents = events.filter((e) => new Date(e.starts_at) >= now).slice(0, 4);

  const blocks = [
    <Block key="open" title="Admissions open now" items={open} />,
    <Block key="closing" title="Admissions closing soon" items={closingSoon} />,
    <Block
      key="news"
      title="School news"
      items={news.slice(0, 4).map((n) => ({
        key: n.id,
        href: newsPath(locale, n.post_slug),
        title: n.title,
        sub: n.school_name,
      }))}
    />,
    <Block
      key="events"
      title="School events"
      items={upcomingEvents.map((e) => ({
        key: e.event_slug,
        href: eventPath(locale, e.event_slug),
        title: e.title,
        sub: e.school_name,
      }))}
    />,
    <Block
      key="jobs"
      title="School jobs"
      items={jobs.slice(0, 4).map((j) => ({
        key: j.job_slug,
        href: jobPath(locale, j.job_slug),
        title: j.title,
        sub: j.school_name,
      }))}
    />,
  ];

  const hasAny =
    open.length + closingSoon.length + news.length + upcomingEvents.length + jobs.length > 0;
  if (!hasAny) return null;
  return <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{blocks}</div>;
}
