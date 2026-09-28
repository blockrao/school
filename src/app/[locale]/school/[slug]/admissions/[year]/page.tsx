import { redirectCampusView } from "../../../../_views/campus-view-redirect";

export default async function Page({
  params,
}: PageProps<"/[locale]/school/[slug]/admissions/[year]">) {
  const { locale, slug, year } = await params;
  return redirectCampusView(locale, slug, "admissions", year);
}
