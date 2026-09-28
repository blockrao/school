import type { Metadata } from "next";
import Link from "next/link";
import { listSchoolRankings } from "@/lib/db/public-adapter";

import { localeAlternates, localeCanonical } from "@/lib/seo";
import { schoolPath } from "@/lib/urls";

const CITY_SLUG = "jaipur";

// Ranking data changes rarely; refresh hourly rather than on every request.
export const revalidate = 3600;

const CATEGORY_LABELS: Record<string, string> = {
  best_day_coed_indian: "Best Co-Ed Day Schools",
  best_day_cum_boarding_indian: "Best Day-cum-Boarding Schools (Indian Curriculum)",
  best_girls_day: "Best Girls' Day Schools",
  best_day_cum_boarding_international: "Best Day-cum-Boarding Schools (International Curriculum)",
  best_emerging_indian: "Best Emerging Schools (Indian Curriculum)",
  best_emerging_international: "Best Emerging Schools (International Curriculum)",
};

const CATEGORY_ORDER = [
  "best_day_coed_indian",
  "best_day_cum_boarding_indian",
  "best_girls_day",
  "best_day_cum_boarding_international",
  "best_emerging_indian",
  "best_emerging_international",
];

// Short editorial blurbs, one per school — descriptive context gathered
// alongside the ranking data, not sourced facts requiring field_provenance.
// Keyed by school id; a school without an entry here just shows its locality.
const SCHOOL_BLURBS: Record<string, string> = {
  "252a9fc7-9a05-4d7a-a7ee-d365a248db67":
    "Named for the Jaipur royal family, this heritage CBSE school in Rambagh appears near the top of both the co-ed and emerging-international rankings.",
  "8c63180c-9262-4a51-bfcd-2370c76511a5":
    "Run by Step By Step Shiksha Samiti, a long-standing fixture in Jaipur's CBSE rankings on Ajmer Road.",
  "ddb2e71e-2713-4035-bddd-f75da2900891":
    "A CBSE day school in Jagatpura managed by the Maharaja Sawai Man Singh II Museum Trust.",
  "6419ff19-6b29-4f90-acf0-2483da9d7199":
    "One of Mansarovar's CBSE campuses — a distinct school from the similarly-named Cambridge Court World School below.",
  "e7c12c42-1081-40da-ab1c-f802c953fb71":
    "A CBSE school near Ambabari, on the northern side of the city.",
  "3582ba0b-dffe-481e-9440-bc24ee9c33ed":
    "Part of the CK Birla Group, with one of the larger campuses among Jaipur's CBSE schools.",
  "2a266b4e-dc5c-406a-b193-165ff686048a":
    "A Jesuit-run CBSE institution on Bhagwan Das Road, C-Scheme, with roots going back to 1941.",
  "f32bcc3e-3148-49c4-9f9d-1960695c2ec2":
    "A separate Mansarovar campus from Cambridge Court High School, run by the same management group.",
  "5dbed8cb-8aa3-423f-90ff-cb2cf713ba9a":
    "Run under the Bharatiya Vidya Bhavan trust, near the Old Terminal Station (OTS) area.",
  "36be8307-1dfa-4c70-9324-12583bb31cee":
    "One of several Maheshwari Public School campuses in Jaipur — this one in Jawahar Nagar.",
  "5a4534c2-bb2d-4858-b6c1-04100fa3d994":
    "Offers CBSE, IB Diploma and Cambridge curricula side by side on its Shipra Path campus.",
  "5759d73e-0fac-4297-ab4d-368e98f33969":
    "The Jaipur campus of the Delhi Public School network, on the Jaipur–Ajmer Highway at Bhankrota.",
  "d0834bd3-6daf-4c62-bccd-84ece0c9564b":
    "An IB Diploma and Cambridge school with day-cum-boarding options, on Ajmer Road's SEZ stretch.",
  "1fdfe4a8-0d87-45d7-810c-4f58faf4f30c":
    "Part of the Mayo family of schools (distinct from Mayo College, Ajmer), based in Sitapura's IT Park.",
  "a22b38ab-9a5a-4aa7-b749-db90afb5c1d5":
    "A newer entrant on Mansarovar's PRN South stretch, under the KGK Foundation in academic collaboration with the Shri Ram Group.",
  "52d54b29-8077-42e4-9aac-ccd99893902a":
    "Founded in 1943 by Maharani Gayatri Devi, one of the region's first institutions for girls' education.",
  "3774acb1-139d-4ee3-93fd-a1ecf16e5678":
    "A girls' school in Vidyadhar Nagar, part of the wider Maheshwari Public School network.",
  "86548836-1d70-4f21-bea6-76ab0b63643d":
    "A long-established girls' school in Vaishali Nagar, running since 1963.",
  "8788a682-846c-4bc9-9209-3700128ee0f3":
    "A missionary-founded girls' school outside Ghat Gate, CBSE-affiliated since 1968.",
  "a1bd7712-f24f-4ef1-9b2e-79101a4777b6": "A co-ed school in Sitapura's IT Park corridor.",
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/guides/top-schools-in-jaipur">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Top Schools in Jaipur, by Category — SchoolOye",
    description:
      "Jaipur's top-ranked schools across co-ed, girls', boarding and emerging categories, with a brief note on each and a link to its full profile.",
    alternates: {
      canonical: localeCanonical(locale, "/guides/top-schools-in-jaipur"),
      languages: localeAlternates("/guides/top-schools-in-jaipur"),
    },
  };
}

export default async function TopSchoolsInJaipurPage({
  params,
}: PageProps<"/[locale]/guides/top-schools-in-jaipur">) {
  const { locale } = await params;
  const rankings = await listSchoolRankings(CITY_SLUG);

  const byCategory = new Map<string, typeof rankings>();
  for (const row of rankings) {
    const bucket = byCategory.get(row.category) ?? [];
    bucket.push(row);
    byCategory.set(row.category, bucket);
  }

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Top Schools in Jaipur</h1>
      <p className="mt-2 text-body text-muted-ink">
        A category-by-category look at Jaipur's highest-ranked schools, based on independent
        rankings, with a link through to each school's full profile.
      </p>

      {rankings.length === 0 ? (
        <p className="mt-8 text-body text-muted-ink">
          Rankings aren't published yet — check back soon.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => (
            <section key={category}>
              <h2 className="font-display text-card font-semibold text-ink">
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <ol className="mt-3 flex flex-col gap-3">
                {(byCategory.get(category) ?? []).map((row) => (
                  <li
                    key={`${row.category}-${row.id}`}
                    className="rounded-md border border-rule p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={schoolPath(locale, row.slug)}
                        className="font-display text-card font-semibold text-ruled-blue hover:underline"
                      >
                        {row.rank ? `#${row.rank}. ` : ""}
                        {row.name_en ?? "Name not yet published"}
                      </Link>
                      {row.locality_name && (
                        <span className="shrink-0 text-meta text-muted-ink">
                          {row.locality_name}
                        </span>
                      )}
                    </div>
                    {SCHOOL_BLURBS[row.id] && (
                      <p className="mt-1 text-body text-muted-ink">{SCHOOL_BLURBS[row.id]}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
