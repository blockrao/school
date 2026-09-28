import { redirectCampusView } from "../../../_views/campus-view-redirect";

export default async function Page({ params }: PageProps<"/[locale]/school/[slug]/admissions">) {
  const { locale, slug } = await params;
  return redirectCampusView(locale, slug, "admissions");
}
