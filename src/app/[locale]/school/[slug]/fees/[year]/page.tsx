import { redirectCampusView } from "../../../../_views/campus-view-redirect";

export default async function Page({ params }: PageProps<"/[locale]/school/[slug]/fees/[year]">) {
  const { locale, slug, year } = await params;
  return redirectCampusView(locale, slug, "fees", year);
}
