import { redirect } from "next/navigation";
import { newsRootPath } from "@/lib/urls";

/**
 * School admission discovery now lives in the existing school-authored news
 * lifecycle. Keep /admissions/help and exam routes untouched; only this
 * obsolete directory root redirects.
 */
export default async function AdmissionsPage({ params }: PageProps<"/[locale]/admissions">) {
  const { locale } = await params;
  redirect(newsRootPath(locale));
}
