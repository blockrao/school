import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import type { CityOption } from "@/lib/city-preference";
import { listPublicAreas } from "@/lib/db/public-adapter";
import { createSessionClient } from "@/lib/db/session";
import { slugify } from "@/lib/slug";

const LOCALES = ["en", "hi"] as const;
type Locale = (typeof LOCALES)[number];

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

async function getLaunchedCityOptions(locale: string): Promise<CityOption[]> {
  const areas = await listPublicAreas();
  return areas
    .filter((area) => area.is_launch)
    .map((area) => ({
      slug: area.slug,
      name: area.name,
      stateSlug: slugify(area.state),
      href: `/${locale}/${area.slug}`,
    }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();

  const [areas, supabase] = await Promise.all([
    getLaunchedCityOptions(locale),
    createSessionClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSignedIn = !!user;

  return (
    <>
      <SiteHeader locale={locale} areas={areas} isSignedIn={isSignedIn} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} />
      <MobileBottomNav locale={locale} areas={areas} />
    </>
  );
}
